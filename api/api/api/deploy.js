import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { files, buildId } = req.body || {};
  
  if (!files && !buildId) {
    return res.status(400).json({ success: false, error: 'No files to deploy' });
  }

  const deployPath = buildId ? path.join('/tmp', buildId) : path.join('/tmp', `deploy-${Date.now()}`);

  try {
    // If files provided (not pre-built), write them
    if (files && !buildId) {
      await fs.ensureDir(deployPath);
      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(deployPath, filePath);
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, content);
      }

      // Build first
      try {
        execSync('npm install', { cwd: deployPath, stdio: 'pipe', timeout: 120000 });
      } catch (e) {}
      
      execSync('npm run build', { 
        cwd: deployPath, 
        stdio: 'pipe', 
        timeout: 180000,
        env: { ...process.env, NODE_ENV: 'production' }
      });
    }

    // Deploy to Vercel (if token available)
    const vercelToken = process.env.VERCEL_TOKEN;
    let deployUrl = null;

    if (vercelToken) {
      // Create vercel.json if not exists
      const vercelConfig = path.join(deployPath, 'vercel.json');
      if (!await fs.pathExists(vercelConfig)) {
        await fs.writeJson(vercelConfig, { version: 2 });
      }

      const deployOutput = execSync(
        `npx vercel --token ${vercelToken} --yes --prod`,
        {
          cwd: deployPath,
          encoding: 'utf-8',
          timeout: 120000,
          env: { ...process.env, VERCEL_TOKEN: vercelToken }
        }
      );

      const urlMatch = deployOutput.match(/https:\/\/[a-zA-Z0-9-]+\.vercel\.app/);
      deployUrl = urlMatch ? urlMatch[0] : null;
    }

    // Create zip for download
    const zipPath = path.join('/tmp', `wfseek-${Date.now()}.zip`);
    await createZip(deployPath, zipPath);
    const zipBuffer = await fs.readFile(zipPath);
    const zipBase64 = zipBuffer.toString('base64');

    // Cleanup
    await fs.remove(zipPath).catch(() => {});

    return res.status(200).json({
      success: true,
      url: deployUrl,
      downloadUrl: `data:application/zip;base64,${zipBase64}`,
      message: deployUrl ? 'Deployed successfully!' : 'Built successfully (deploy token needed for auto-deploy)'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Deploy failed',
      stage: 'deploy'
    });
  }
}

function createZip(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}
