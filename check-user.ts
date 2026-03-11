import db from './lib/db';

async function main() {
    const users = await db.user.findMany({ select: { id: true, email: true, role: true } });
    console.log(users);
}

main().catch(console.error).finally(() => db.$disconnect());
