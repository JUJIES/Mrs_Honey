# Scene Card Image Pipeline Rules

Goal: vocabulary card images should read clearly inside the app card without manual cleanup.

Generation rules:
- Start from `references/source_images/scene_card_prompt_templates.json` and pick the template that matches the subject shape.
- Do not automatically force single-image generation. Choose the generation strategy by risk: ordinary simple items can be batched; people, animals, long/tall objects, bags, books, furniture, and previous failures should use smaller batches or single images.
- Prompt every scene card with: full subject visible, centered, at least 24-30 percent breathing room on all sides, no object touching edges, no text, no border, no frame, no white margins.
- Prefer a slightly too airy source image over a tight source image. A controlled light crop can remove generated white corners or excess empty border, but it cannot restore clipped ears, tails, handles, feet, or corners.
- For people and animals, choose either a deliberate portrait crop or a complete full-body view. Avoid accidental edge crops.
- For long objects, ask for a smaller diagonal composition with the full object visible from end to end.

Import and QA rules:
- Run `tools/sync_image_assets.py` after replacing images so set bundles stay current.
- Always generate a full contact sheet for visual review. Use `--qa-full-contact references/source_images/<name>_full_contact.png`.
- For a focused review list, also run the QA with `--qa-candidates references/source_images/<name>_qa_candidates.json --qa-candidate-contact references/source_images/<name>_qa_candidates.png`.
- Treat the focused candidate list as a review queue, not an automatic failure list. The full contact sheet is still required for final approval.
- Treat white stripe warnings, large visual center offsets, and padding-sensitive subjects as candidates for rerendering rather than crop hacks.
- Do not add artificial blurred/extended borders around cropped cards. If the source motif is too close to the edge, rerender or reimport from a source with more margin.
