import Docker from 'dockerode';
import { Writable } from 'stream';
import { logger } from './logger.js';

const docker = new Docker();

export interface ContainerRunOptions {
  image: string;
  command?: string[];
  env?: Record<string, string>;
  volumes?: Record<string, { bind: string; mode: 'ro' | 'rw' }>;
  autoRemove?: boolean;
  networkMode?: string;
  tty?: boolean;
  liveOutput?: boolean;
  stdoutTarget?: NodeJS.WritableStream;
  stderrTarget?: NodeJS.WritableStream;
}

export interface ContainerOutput {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface BufferedSink {
  sink: Writable;
  done: Promise<void>;
  getOutput: () => string;
}

function createBufferedSink(target?: NodeJS.WritableStream): BufferedSink {
  let output = '';

  const sink = new Writable({
    write(chunk, _encoding, callback) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      output += buffer.toString();

      if (target) {
        target.write(buffer);
      }

      callback();
    },
  });

  const done = new Promise<void>((resolve, reject) => {
    sink.once('finish', resolve);
    sink.once('error', reject);
  });

  return {
    sink,
    done,
    getOutput: () => output,
  };
}

export async function isDockerRunning(): Promise<boolean> {
  try {
    await docker.ping();
    return true;
  } catch {
    return false;
  }
}

export async function pullImageIfNeeded(image: string): Promise<void> {
  try {
    await docker.getImage(image).inspect();
    logger.debug(`Image ${image} already exists`);
  } catch {
    logger.info(`Pulling image ${image}...`);

    await new Promise<void>((resolve, reject) => {
      docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) {
          reject(err);
          return;
        }

        docker.modem.followProgress(
          stream,
          (err: Error | null) => {
            if (err) reject(err);
            else resolve();
          },
          (event: { status: string; progress?: string }) => {
            if (event.progress) {
              logger.debug(`${event.status}: ${event.progress}`);
            }
          }
        );
      });
    });

    logger.success(`Image ${image} pulled successfully`);
  }
}

export async function runContainer(options: ContainerRunOptions): Promise<ContainerOutput> {
  const {
    image,
    command = [],
    env = {},
    volumes = {},
    autoRemove = true,
    tty = false,
    liveOutput = false,
    stdoutTarget,
    stderrTarget,
  } = options;

  // Ensure image is available
  await pullImageIfNeeded(image);

  // Convert env object to array format
  const envArray = Object.entries(env).map(([key, value]) => `${key}=${value}`);

  // Convert volumes object to Docker format
  const binds = Object.entries(volumes).map(
    ([hostPath, { bind, mode }]) => `${hostPath}:${bind}:${mode}`
  );

  logger.debug('Creating container', { image, command, env: Object.keys(env) });

  const container = await docker.createContainer({
    Image: image,
    Cmd: command,
    Env: envArray,
    HostConfig: {
      Binds: binds,
      AutoRemove: autoRemove,
    },
    Tty: tty,
    AttachStdout: true,
    AttachStderr: true,
  });

  let stdout = '';
  let stderr = '';

  const stream = await container.attach({
    stream: true,
    stdout: true,
    stderr: true,
  });

  const stdoutSink = createBufferedSink(stdoutTarget || (liveOutput ? process.stdout : undefined));
  const stderrSink = createBufferedSink(stderrTarget || (liveOutput ? process.stderr : undefined));

  const outputComplete = new Promise<void>((resolve, reject) => {
    let finalized = false;

    const finalize = () => {
      if (finalized) {
        return;
      }
      finalized = true;

      stdoutSink.sink.end();
      stderrSink.sink.end();

      Promise.all([stdoutSink.done, stderrSink.done]).then(() => resolve(), reject);
    };

    stream.once('error', reject);
    stream.once('end', finalize);
    stream.once('close', finalize);
  });

  // Docker attaches stdout/stderr over a multiplexed stream unless TTY is enabled.
  docker.modem.demuxStream(stream, stdoutSink.sink, stderrSink.sink);

  await container.start();

  const result = await container.wait();
  await outputComplete;

  stdout = stdoutSink.getOutput();
  stderr = stderrSink.getOutput();

  return {
    exitCode: result.StatusCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  };
}

export async function getContainerLogs(containerId: string): Promise<string> {
  const container = docker.getContainer(containerId);
  const logs = await container.logs({
    stdout: true,
    stderr: true,
    follow: false,
  });
  return logs.toString();
}

export async function isContainerRunning(containerName: string): Promise<boolean> {
  try {
    const containers = await docker.listContainers({
      filters: { name: [containerName] },
    });
    return containers.length > 0;
  } catch {
    return false;
  }
}

export { docker };
