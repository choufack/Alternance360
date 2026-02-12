
import { fetchRNCPBasicInfo } from '@/lib/rncp-api';

async function testFetch(code: string) {
    console.log(`Testing fetch for ${code}...`);
    const result = await fetchRNCPBasicInfo(code);
    if (result.success && result.data) {
        console.log('Title:', result.data.title);
        const blocks = result.data.raw_blocks;
        console.log('Number of blocks in raw data:', Array.isArray(blocks) ? blocks.length : 'Not an array');
        if (Array.isArray(blocks)) {
            blocks.forEach((b: any, i: number) => {
                const title = b.intitule || b.intitule_bloc || b.title || 'Untitled';
                console.log(`Block ${i + 1}: ${title}`);
            });
        }
        const jsonLength = JSON.stringify(blocks).length;
        console.log('Total JSON length of raw blocks:', jsonLength);
    } else {
        console.error('Fetch failed:', result.error);
    }
}

const code = process.argv[2] || "RNCP39583";
testFetch(code).finally(() => process.exit());
