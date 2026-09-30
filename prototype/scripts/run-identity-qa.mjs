import { spawnSync } from 'node:child_process';
const tests=[
  'test_zhou_guard_terminal_b1_qa.js',
  'test_identity_m9_pair_qa.js',
  'test_identity_ending_scene_qa.js',
  'test_b2_exit_recovery_qa.js',
  'test_identity_routes_qa.js',
  'test_zhang_er_terminal_qa.js',
  'test_identity_route_detours_qa.js',
  'test_scene_followthrough_qa.js',
  'test_clinical_interaction_closure_qa.js',
  'test_first_duty_bathroom_qa.js',
  'test_identity_mission_brief_qa.js',
  'test_chen_fifteen_steps_qa.js',
  'test_zhang_sixteen_steps_qa.js',
  'test_zhou_sixteen_steps_qa.js',
  'test_identity_m6_cg_qa.js',
  'test_shared_media_qa.js',
  'test_annie_route_seed_qa.js','test_identity_route_audio_qa.js',
  'test_identity_seed_persistence_qa.js','test_identity_shuffle_bag_qa.js','test_identity_m1_m8_no_leak_qa.js','test_identity_m5_skybridge_only_qa.js','test_identity_m6_anchor_qa.js','test_identity_bpanel_qa.js','test_identity_b2_one_way_qa.js','test_identity_b2_no_answer_qa.js','test_identity_m9_single_commit_qa.js','test_identity_good_endings_qa.js','test_identity_wrong_memory_qa.js','test_identity_m10_unlock_qa.js','test_identity_storage_namespace_qa.js','test_li_route_choice_expansion_qa.js','test_li_polish_qa.js','test_chen_route_expansion_qa.js'
];
for(const test of tests){const result=spawnSync(process.execPath,[test],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
console.log(`PASS identity QA: ${tests.length} tests`);
