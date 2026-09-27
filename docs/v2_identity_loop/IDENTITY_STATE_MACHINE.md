# Identity state machine

```text
NEW_RUN
  -> M1 -> M2 -> M3 -> M4 -> M5 -> M6 -> M7
  -> B2_ENTERED (one-way) -> M8 -> M9_READY
  -> M9_COMMITTED
       -> GOOD_END(identity) -> NEW_RUN / M10 when all four are complete
       -> WRONG_MEMORY_BAD_END -> 409_PATIENTIZATION -> NEW_RUN
```

`currentIdentity` is assigned once per unfinished run. `m9CommittedChoice` is write-once. `b2Entered` is write-once. Good ends are stored in `metaSave.completedGoodEnds`; wrong ends never add to that list.
