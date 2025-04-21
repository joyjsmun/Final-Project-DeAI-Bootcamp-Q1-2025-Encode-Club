import { spawn, exec } from 'child_process';

async function runDeploymentScript() {
  console.log('\n⏳ Running deployment script...');
  // Execute the deployment script
  const deployProcess = exec('npx hardhat run scripts/deployTokens.ts --network localhost');

  // Pipe deployment script output to the main console
  deployProcess.stdout?.pipe(process.stdout);
  deployProcess.stderr?.pipe(process.stderr);

  deployProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Deployment script finished successfully.');
    } else {
      console.error(`\n❌ Deployment script exited with code ${code}`);
    }
    console.log('\nHardhat node is running. Press Ctrl+C to stop.');
    // Keep the main script alive while the node runs
  });

  deployProcess.on('error', (error) => {
    console.error('\n❌ Failed to run deployment script:', error);
    // Optionally exit if deployment fails critically
    // process.exit(1);
  });
}

async function startHardhatNode() {
  console.log('Starting Hardhat node...');

  // Use spawn to execute the command, piping stdio
  const hardhatNode = spawn('npx', ['hardhat', 'node'], {
    stdio: ['pipe', 'pipe', 'pipe'], // Pipe stdin, stdout, stderr
  });

  let nodeReady = false;
  const nodeReadyString = 'Started HTTP and WebSocket JSON-RPC server';

  // Handle stdout
  hardhatNode.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output); // Print node output

    // Check if the node is ready and deployment hasn't run yet
    if (!nodeReady && output.includes(nodeReadyString)) {
      nodeReady = true;
      console.log('\n🚀 Hardhat node ready.');
      runDeploymentScript(); // Run deployment script
    }
  });

  // Handle stderr
  hardhatNode.stderr.on('data', (data) => {
    process.stderr.write(data.toString()); // Print node error output
  });

  // Handle potential errors during spawning
  hardhatNode.on('error', (error) => {
    console.error('Failed to start Hardhat node process:', error);
    process.exit(1);
  });

  // Handle process exit
  hardhatNode.on('close', (code) => {
    console.log(`\nHardhat node process exited with code ${code}.`);
    // Exit the parent script when the node stops
    process.exit(code ?? 0);
  });

  console.log('Hardhat node process spawning...');
}

startHardhatNode(); 