import Docker from 'dockerode';
import { logger } from './logger.js';

const docker = new Docker();

export interface ContainerRunOptions {
  image: string;
  command?: string[];
  env?: Record<string, string>;
  volumes?: Record<string, { bind: string; mode: 'ro' | 'rw' }>;
  autoRemove?: boolean;
  networkMode?: string;
}

export interface ContainerOutput {
  exitCode: number;
  stdout: string;
  stderr: string;
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
  const { image, command = [], env = {}, volumes = {}, autoRemove = true } = options;

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

  // Demultiplex stdout and stderr
  stream.on('data', (chunk: Buffer) => {
    const str = chunk.toString();
    // Docker multiplexes stdout/stderr with a header
    // For simplicity, we'll capture both as stdout
    stdout += str;
  });

  await container.start();

  const result = await container.wait();

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
