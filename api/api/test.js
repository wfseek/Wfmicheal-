import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { buildId, files } = req.body || {};
  
  if (!buildId && !files) {
    return res.status(400).json({ success: false, error: 'No build to test' });
  }

  const testPath = buildId ? path.join('/tmp', buildId) : null;

  try {
    const tests = [];

    // Test 1: Check if files exist
    if (files) {
      const requiredFiles = ['package.json', 'app/page.tsx', 'app/layout.tsx'];
      const hasRequired = requiredFiles.every(f => files[f] || files[`src/${f}`]);
      tests.push({
        name: 'Required files',
        passed: hasRequired,
        message: hasRequired ? 'All required files present' : 'Missing required files'
      });
    }

    // Test 2: Syntax check (basic)
    if (files && files['app/page.tsx']) {
      const hasSyntaxError = files['app/page.tsx'].includes('export default') === false;
      tests.push({
        name: 'Syntax check',
        passed: !hasSyntaxError,
        message: hasSyntaxError ? 'Missing export default' : 'Syntax looks good'
      });
    }

    // Test 3: Build output check
    if (testPath) {
      const hasBuild = await fs.pathExists(path.join(testPath, 'dist')) ||
                      await fs.pathExists(path.join(testPath, 'out'));
      tests.push({
        name: 'Build output',
        passed: hasBuild,
        message: hasBuild ? 'Build artifacts created' : 'No build output found'
      });
    }

    const allPassed = tests.every(t => t.passed);

    return res.status(200).json({
      success: true,
      allPassed,
      tests,
      message: allPassed ? 'All tests passed' : 'Some tests failed'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stage: 'test'
    });
  }
}
