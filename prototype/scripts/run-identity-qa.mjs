import { spawnSync } from 'node:child_process';
const tests=[
  'test_identity_routes_qa.js',
  'test_identity_seed_persistence_qa.js','test_identity_shuffle_bag_qa.js','test_identity_m1_m8_no_leak_qa.js','test_identity_m5_skybridge_only_qa.js','test_identity_m6_anchor_qa.js','test_identity_bpanel_qa.js','test_identity_b2_one_way_qa.js','test_identity_b2_no_answer_qa.js','test_identity_m9_single_commit_qa.js','test_identity_good_endings_qa.js','test_identity_wrong_memory_qa.js','test_identity_m10_unlock_qa.js','test_identity_storage_namespace_qa.js'
];
for(const test of tests){const result=spawnSync(process.execPath,[test],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
console.log(`PASS identity QA: ${tests.length} tests`);
