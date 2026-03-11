import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        // Frontend is running on typing-frontend-1 container, exposing port 5173
        await page.goto('http://frontend:5173', { waitUntil: 'networkidle0' });
        
        // Wait for DOM
        await page.waitForSelector('.lobby-container', { timeout: 10000 });
        
        // Take screenshot
        await page.screenshot({ path: '/app/frontend_screenshot.png' });
        
        // Get number of rooms
        const rooms = await page.$$('.room-card');
        console.log(`Rooms found: ${rooms.length}`);
        
        await browser.close();
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
