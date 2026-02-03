/**
 * Google API authentication module.
 * Handles service account credentials from file or base64 env var.
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

// API Scopes
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
];

let cachedAuth: InstanceType<typeof google.auth.GoogleAuth> | null = null;

/**
 * Get Google Auth client.
 * Supports both file-based and base64-encoded credentials.
 */
export function getGoogleAuth() {
  if (cachedAuth) {
    return cachedAuth;
  }

  // Check for base64-encoded credentials (cloud deployment)
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
  if (credentialsJson) {
    const decoded = Buffer.from(credentialsJson, 'base64').toString('utf-8');
    const credentials = JSON.parse(decoded);

    cachedAuth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });
    return cachedAuth;
  }

  // File-based credentials (local development)
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials/service-account.json';
  const absolutePath = path.isAbsolute(credentialsPath)
    ? credentialsPath
    : path.join(process.cwd(), credentialsPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Credentials file not found at: ${absolutePath}`);
  }

  cachedAuth = new google.auth.GoogleAuth({
    keyFile: absolutePath,
    scopes: SCOPES,
  });

  return cachedAuth;
}

/**
 * Get GA4 Analytics Data API client.
 */
export function getGA4Client() {
  const auth = getGoogleAuth();
  return google.analyticsdata({
    version: 'v1beta',
    auth,
  });
}

/**
 * Get Search Console API client.
 */
export function getGSCClient() {
  const auth = getGoogleAuth();
  return google.searchconsole({
    version: 'v1',
    auth,
  });
}

/**
 * Test API connections.
 */
export async function testConnection(): Promise<{
  credentials: boolean;
  ga4: boolean;
  gsc: boolean;
  errors: string[];
}> {
  const status = {
    credentials: false,
    ga4: false,
    gsc: false,
    errors: [] as string[],
  };

  try {
    getGoogleAuth();
    status.credentials = true;
  } catch (e) {
    status.errors.push(`Credentials: ${e instanceof Error ? e.message : String(e)}`);
    return status;
  }

  try {
    getGA4Client();
    status.ga4 = true;
  } catch (e) {
    status.errors.push(`GA4: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const gsc = getGSCClient();
    await gsc.sites.list();
    status.gsc = true;
  } catch (e) {
    status.errors.push(`GSC: ${e instanceof Error ? e.message : String(e)}`);
  }

  return status;
}
