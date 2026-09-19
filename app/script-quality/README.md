# Script Quality Engine v1

The engine is opt-in:

- `SCRIPT_ENGINE_MODE=quality` enables the four-stage pipeline.
- Missing or any other value keeps the existing Legacy Script Engine.

Quality stages:

1. Creative Strategist — DeepSeek when configured, otherwise OpenAI.
2. Script Writer — OpenAI.
3. Script Critic — OpenAI.
4. Targeted Rewrite — OpenAI, at most once and only when critique requires it.

If OpenAI is unavailable or a quality stage fails validation, the route logs `QUALITY_ENGINE_FALLBACK` and continues through the existing Legacy generation path.

The Writer uses an internal compact schema. `engine.ts` deterministically maps it to the existing public `StructuredScript` contract. No Project Memory or database schema changes are required.

Timeout budget:

- Creative: 30 seconds
- Writer: 45 seconds
- Critic: 30 seconds
- Rewrite: 35 seconds
- Route: 180 seconds

Five-script Writer/Critic paths run concurrently after the single Creative stage, keeping the bounded worst-case stage path near 140 seconds plus application overhead.

`few-shots/index.ts` intentionally contains an empty, configurable registry. Only human-approved examples should be added later.

