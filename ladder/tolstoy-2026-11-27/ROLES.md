# Roles (§4, B1)
- Author: Thomas Densley (owner of the Ladder, the corpus and the definitions). Not present during this run; every item needing a ruling is in OPEN.md.
- Operator / builder: a Claude Code session (this run). Builds: grouping (P9), rescoped phrasings (P14), repairs (P15), board and record. Never tests or grades its own construction.
- Auxiliary builder AUX-1: x-ai/grok-4.7 via OpenRouter, one fresh API request per task. Builds: P1 extraction, P3 generalization, P17 surplus derivation.
- Auxiliary fresh auditors AUD: deepseek/deepseek-v4-pro-0813 via OpenRouter, one fresh request per task. Runs: P4 fresh audit, P6 gate, P7 path classification, P8 Tests 1 and 2, P12 generality, P13 classification. Interim prompts (no fixed prompt exists, §5.3.12; OPEN O-01).
- Counter-AI: openai/gpt-5.6-sol via OpenRouter, one fresh request per CX run, fixed prompt §5.4 only.
