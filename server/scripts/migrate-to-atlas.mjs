/**
 * Copies every collection (documents + indexes, _ids preserved) from LOCAL_MONGODB_URI to MONGODB_URI.
 *   node scripts/migrate-to-atlas.mjs            → dry run: shows counts on both sides
 *   node scripts/migrate-to-atlas.mjs --apply    → copies (replaces target collections that exist in the source)
 */
import "dotenv/config";
import { MongoClient } from "mongodb";

const SOURCE = process.env.LOCAL_MONGODB_URI;
const TARGET = process.env.MONGODB_URI;
const apply = process.argv.includes("--apply");
if (!SOURCE || !TARGET) throw new Error("Set LOCAL_MONGODB_URI and MONGODB_URI in server/.env");
if (SOURCE === TARGET) throw new Error("Source and target are the same database");

const redact = (uri) => uri.replace(/\/\/([^:]+):[^@]+@/, "//$1:****@");
const src = new MongoClient(SOURCE);
const dst = new MongoClient(TARGET, { serverSelectionTimeoutMS: 20_000 });
await Promise.all([src.connect(), dst.connect()]);
const sdb = src.db();
const ddb = dst.db();
console.log(`source: ${redact(SOURCE)} (${sdb.databaseName})\ntarget: ${redact(TARGET)} (${ddb.databaseName})`);

const collections = (await sdb.listCollections({}, { nameOnly: true }).toArray())
  .map((c) => c.name)
  .filter((n) => !n.startsWith("system."));

let total = 0;
for (const name of collections.sort()) {
  const from = await sdb.collection(name).countDocuments();
  const before = await ddb.collection(name).countDocuments().catch(() => 0);
  if (!apply) {
    console.log(`  ${name.padEnd(24)} source ${String(from).padStart(5)}  target ${before}`);
    continue;
  }
  await ddb.collection(name).drop().catch(() => undefined);
  const docs = await sdb.collection(name).find().toArray();
  for (let i = 0; i < docs.length; i += 1000) {
    await ddb.collection(name).insertMany(docs.slice(i, i + 1000), { ordered: false });
  }
  const indexes = (await sdb.collection(name).indexes()).filter((ix) => ix.name !== "_id_");
  if (indexes.length) {
    await ddb.collection(name).createIndexes(
      indexes.map(({ key, name: ixName, unique, sparse, expireAfterSeconds, partialFilterExpression }) => ({
        key,
        name: ixName,
        ...(unique ? { unique } : {}),
        ...(sparse ? { sparse } : {}),
        ...(expireAfterSeconds !== undefined ? { expireAfterSeconds } : {}),
        ...(partialFilterExpression ? { partialFilterExpression } : {}),
      })),
    );
  }
  const after = await ddb.collection(name).countDocuments();
  total += after;
  console.log(`  ${name.padEnd(24)} copied ${String(after).padStart(5)} / ${from}  (+${indexes.length} indexes)`);
}
if (apply) console.log(`done: ${total} documents in ${collections.length} collections`);
await Promise.all([src.close(), dst.close()]);
