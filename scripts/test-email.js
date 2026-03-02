
const { sendEmailToApprenti } = require('../lib/mail');

async function testEmail() {
    console.log('--- Testing sendEmailToApprenti (Dev Mode) ---');

    const apprentice = {
        firstName: 'Jenny',
        lastName: 'Choufack',
        email: 'choufackjennybrandy@gmail.com'
    };

    const token = 'test-secure-token-123';

    const result = await sendEmailToApprenti(apprentice, token);

    console.log('Result:', result);

    if (result.success && result.mode === 'dev_log') {
        console.log('   SUCCESS: Function handled dev mode correctly.');
    } else if (!result.success && result.error === 'Email missing') {
        console.error('   FAILED: Validation failed incorrectly.');
    }
}

testEmail().catch(console.error);
