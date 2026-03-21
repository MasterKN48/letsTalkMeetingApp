import { spawn } from 'node:child_process';

const child = spawn('ls', [], {
    stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe']
});

console.log('stdio[3]:', child.stdio[3]);
console.log('stdio[4]:', child.stdio[4]);
process.exit(0);
