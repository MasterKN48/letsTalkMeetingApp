import { spawn } from 'node:child_process';

const child = spawn('ls', [], {
    stdio: ['ignore', 'ignore', 'ignore', 'pipe']
});

console.log('stdio[3]:', child.stdio[3]);
process.exit(0);
