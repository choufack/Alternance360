
import { fetchRNCPBasicInfo } from '../lib/rncp-api';

async function testApi() {
    console.log('Fetching RNCP38565...');
    const res1 = await fetchRNCPBasicInfo('RNCP38565');
    console.log('RNCP38565:', JSON.stringify(res1, null, 2));

    console.log('\nFetching RNCP39583...');
    const res2 = await fetchRNCPBasicInfo('RNCP39583');
    console.log('RNCP39583:', JSON.stringify(res2, null, 2));
}

testApi()
    .catch(err => console.error(err))
    .finally(() => process.exit());
