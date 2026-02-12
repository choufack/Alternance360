
async function testCdcApi() {
    const code = "RNCP34068";
    const url = `https://opendata.caissedesdepots.fr/api/explore/v2.1/catalog/datasets/donnees-de-certification-rncp/records?where=numero_fiche=%22${code}%22&limit=1`;
    console.log('Fetching from CDC:', url);
    try {
        const response = await fetch(url);
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

testCdcApi()
    .catch(err => console.error(err));
