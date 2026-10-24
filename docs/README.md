# Docs index

Start here only if you are a human browsing. **Agents start at [`AGENTS.md`](https://github.com/ChloeVPin/tempo/blob/main/AGENTS.md).**

| File | Read it for |
|---|---|
| [HANDOFF.md](https://github.com/ChloeVPin/tempo/blob/main/docs/HANDOFF.md) | Current truth, gaps, how to take over |
| [STATUS.md](https://github.com/ChloeVPin/tempo/blob/main/docs/STATUS.md) | File-by-file implementation status |
| [INVARIANTS.md](https://github.com/ChloeVPin/tempo/blob/main/docs/INVARIANTS.md) | Behaviors that must not change |
| [WORK-PACKAGES.md](https://github.com/ChloeVPin/tempo/blob/main/docs/WORK-PACKAGES.md) | Sequenced next work |
| [DESIGN.md](https://github.com/ChloeVPin/tempo/blob/main/docs/DESIGN.md) | Why the API looks like this |
| [ARCHITECTURE.md](https://github.com/ChloeVPin/tempo/blob/main/docs/ARCHITECTURE.md) | Module layout (must match `src/`) |
| [ROADMAP.md](https://github.com/ChloeVPin/tempo/blob/main/docs/ROADMAP.md) | Phases and decision log |
| [API.md](API.md) | Public API sketch |
| [RELEASE-1.0.0.md](RELEASE-1.0.0.md) | npm/GitHub release announcement draft |
| [WHY-TEMPO.md](WHY-TEMPO.md) | Broken date behaviors and Tempo fixes |
| [MIGRATION.md](MIGRATION.md) | Moment to Tempo |
| [TESTING.md](TESTING.md) | Test philosophy |
| [RESEARCH.md](https://github.com/ChloeVPin/tempo/blob/main/docs/RESEARCH.md) | Background only. It is not an implementation spec. |

Rule: `src/` + tests + INVARIANTS beat any narrative doc. If you change behavior, update INVARIANTS in the same commit.
