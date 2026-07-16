import puppeteer from 'puppeteer';
import { setTimeout } from 'timers/promises';

const run = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to login page...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });

  console.log('Logging in...');
  await page.waitForSelector('#email', { timeout: 30000 });
  await page.type('#email', 'arya@mintsglobal.ae');
  await page.type('#password', 'xq336kanAa1!');
  await page.click('button[type="submit"]');

  console.log('Waiting for dashboard...');
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });

  // wait a bit extra for data to render fully
  await setTimeout(3000);

  const capture = async (urlPath, filename, scroll = 0) => {
    console.log(`Capturing ${filename} from ${urlPath}...`);
    try {
      await page.goto(`http://localhost:3000${urlPath}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await setTimeout(4000); // Wait for animations/rendering and data fetching
      
      if (scroll > 0) {
        await page.evaluate((s) => window.scrollBy(0, s), scroll);
        await setTimeout(1000); // Wait after scroll
      }
      
      await page.screenshot({ path: `d:/Enterprise Resource Planning/mintsglobal-erp/public/${filename}` });
      console.log(`Saved ${filename}`);
    } catch (err) {
      console.error(`Failed to capture ${filename}: ${err}`);
    }
  };

  const screenshots = [
    { path: '/dashboard', filename: 'Screenshot1.png' },
    { path: '/dashboard', filename: 'Screenshot2.png', scroll: 600 }, 
    { path: '/dashboard/attendance', filename: 'live_presence_map.png' },
    { path: '/dashboard/attendance', filename: 'timesheet_matrix.png', scroll: 300 },
    { path: '/dashboard/files', filename: 'cloud_drive.png' },
    { path: '/dashboard/settings', filename: 'discord_settings.png' },
    { path: '/dashboard/hr', filename: 'products_services_badge.png' },
    { path: '/dashboard/chat', filename: 'chat_channels.png' },
    { path: '/dashboard/tasks', filename: 'workflow_builder.png' },
    { path: '/dashboard/clients', filename: 'client_portal.png' },
    { path: '/dashboard/hr', filename: 'drawer_verification.png', action: async () => {
      // attempt to click on the first employee card to open the drawer
      try {
        await page.click('td:first-child');
        await setTimeout(1500);
      } catch(e) {}
    } }
  ];

  for (const s of screenshots) {
    if (s.action) {
      await capture(s.path, s.filename); // Just navigate
      await s.action(); // Perform action
      await page.screenshot({ path: `d:/Enterprise Resource Planning/mintsglobal-erp/public/${s.filename}` });
      console.log(`Saved ${s.filename} (with action)`);
    } else {
      await capture(s.path, s.filename, s.scroll || 0);
    }
  }

  await browser.close();
};

run().catch(console.error);
