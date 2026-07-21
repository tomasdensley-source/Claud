# Fieldnote Improvements 211-410

211. Wired selected card resize gestures to `resizeItem` instead of rendering decorative-only handles.
212. Added a responder-driven bottom-right resize handle for selected cards.
213. Resizes update continuously during drag for immediate visual feedback.
214. Resizes commit a history entry on release.
215. Resize gestures cancel active card dragging so drag and resize do not compete.
216. Resize termination now commits the last known size instead of leaving stale gesture state.
217. Palette color application now treats text cards as text-color edits.
218. Palette color application no longer sets text color equal to a card fill for non-text cards.
219. Palette color application sets shape border and fill together for shape selections.
220. Palette color application updates drawing color only while draw mode is active.
221. Added clearer draw-mode labels: Pen, High, and Eraser.
222. Added quick small-text formatting from the palette.
223. Added quick large-text formatting from the palette.
224. Added quick bold formatting from the palette.
225. Added quick center-align formatting from the palette.
226. Added a quick oval shape formatting action from the palette.
227. Added `borderColor` support to shape items.
228. Shape rectangles now render their configured border color.
229. Shape ellipses now render their configured border color.
230. Shape lines now render their configured border color.
231. Task connector metadata now stores the chosen source side.
232. Task connector metadata now stores the chosen target side.
233. Dependency rendering now reads stored connector-side metadata.
234. Dependency rendering now falls back safely to right-to-left sides for older data.
235. Added top connector geometry for task cards.
236. Added bottom connector geometry for task cards.
237. Added side-point connector geometry shared by all task dependency lines.
238. Added arrowheads to task dependency lines.
239. Completed dependencies now render arrowheads in the success color.
240. Active dependency source cards now get a distinct connector highlight.
241. Added a dependency-connection banner while a connection is active.
242. Added an explicit Cancel action for dependency connection mode.
243. Cancelling connection mode now clears `connectingFrom`.
244. Tapping the same connector source now cancels connection mode.
245. Dependency connection invalid-state toasts remain routed through the board context.
246. Added removal of the newest dependency from the selected task.
247. Dependency removal also removes the matching connector-side metadata.
248. Added a selection-toolbar Unlink action for dependency removal.
249. Added task priority metadata to the data model.
250. Added task due-date metadata to the data model.
251. Task cards now display non-normal priority metadata.
252. Task cards now display due-date metadata when present.
253. Blocked task metadata remains visible alongside dependencies.
254. Board load no longer marks the app dirty before a real edit.
255. Initial ready-state autosave scheduling is skipped after hydration.
256. Autosave still schedules normally after subsequent board changes.
257. Save status now shows `Saved`, `Saving...`, or `Unsaved changes`.
258. Save status is text-based and not color-only.
259. Board delete no longer nests `setCurrentBoardId` inside `setBoards`.
260. Board delete computes the safe next active board before updating state.
261. Deleting an active board now switches to a safe remaining board.
262. Active board deletion is explained in the Boards panel.
263. Last-board deletion remains blocked by context state.
264. Board rename now creates an undo history snapshot.
265. Board rename skips empty no-op history when the name is unchanged.
266. Board rename now has an explicit Save button.
267. Board rename now has an explicit Cancel button.
268. Board rename TextInput now uses a done return key.
269. Duplicate selected items now warns when locked items are included.
270. Locked mind-map branches now block deletion if any descendant is locked.
271. Locked mind-map deletion no longer orphans locked children.
272. Mind-map branch deletion deletes the whole unlocked subtree.
273. Deleted task dependencies are pruned from remaining tasks.
274. Deleted task connector-side metadata is pruned from remaining tasks.
275. File-card opening now routes through a try/catch wrapper.
276. Failed file opening now shows a toast instead of throwing from `Linking`.
277. File cards no longer call `Linking.openURL` directly from render code.
278. PDF cards now support a real URI.
279. Audio cards now support a real URI.
280. Markdown cards now support a real URI.
281. PDF cards now show an Open chip when a URI exists.
282. Audio cards now show an Open chip when a URI exists.
283. Markdown cards now show an Open chip when a URI exists.
284. Reset now deletes copied Fieldnote files under `fieldnote-files/`.
285. Reset toast now confirms copied files were cleared.
286. Reset confirmation copy now warns that copied files will be deleted.
287. Storage reset copy now recommends exporting first.
288. Added helpers to locate the Fieldnote copied-files directory.
289. Added helpers to identify Fieldnote-owned copied file URIs.
290. Added helpers to delete individual copied Fieldnote assets.
291. Added helpers to clear all copied Fieldnote assets.
292. Export now includes working-file metadata.
293. Export now marks whether working files are local copied assets.
294. Export now includes an `assetBase` hint for `fieldnote-files/`.
295. Export rewrites board-local file URIs to portable relative names when possible.
296. Export rewrites working-file URIs to portable relative names when possible.
297. Export preserves non-Fieldnote external URIs unchanged.
298. Export schema version was advanced for the richer package payload.
299. Import now pushes undo history before adding an imported board.
300. Import now clears selection after switching to the imported board.
301. Import still rolls back naturally on JSON parse failure before state changes.
302. Working-file additions now push undo history.
303. Working-file removals now push undo history.
304. Undo now restores working-file state.
305. Redo now restores working-file state.
306. History snapshots now include boards, current board ID, and working files.
307. Internal clipboard now persists to AsyncStorage.
308. Internal clipboard now reloads during board provider startup.
309. Copy now writes selected items to the system clipboard when available.
310. Clipboard persistence uses migrated board-item normalization before restore.
311. Paste now accepts a viewport center.
312. Paste from the zoom controls now places copies in the current viewport.
313. Paste now toasts when the clipboard is empty.
314. Paste now confirms that content was pasted into view.
315. Selection duplicate still uses offset paste behavior.
316. Added selected-item z-order bring-forward action.
317. Added selected-item z-order send-backward action.
318. Added selection-toolbar Front action.
319. Added selection-toolbar Back action.
320. Added explicit selection-toolbar Edit action.
321. Added explicit selection-toolbar Deselect action.
322. Selection toolbar actions now include text labels.
323. Paste and Duplicate now use distinct icons.
324. Selected text/task/mind-map cards can enter edit mode without long-press.
325. Text edits now debounce history instead of pushing every keystroke.
326. Text edit blur now commits pending typing history immediately.
327. Pending typing history records the pre-edit snapshot.
328. Text inputs for text cards now use a done return key.
329. Text inputs for task cards now use a done return key.
330. Text inputs for mind-map cards now use a done return key.
331. Programmatic fit and zoom now animate with `withTiming`.
332. Initial canvas scale now matches the app scale state.
333. Orientation changes no longer force a fit and lose the current camera.
334. Board switching fits only when the existing camera is far off content.
335. Double-tap Add now records the tapped world position.
336. AddPanel receives the tapped world position for placement.
337. AddPanel resets temporary placement after closing.
338. Draw eraser sampling now interpolates denser points along fast strokes.
339. Drawing finalization clears the last sampled draw point.
340. Draw gesture finalization now recovers after cancellation.
341. Pan gesture finalization reports the latest transform.
342. Marquee finalization clears stale marquee rectangles.
343. Minimap now renders the current viewport rectangle.
344. Minimap now supports drag-to-navigate.
345. Minimap tap navigation clamps touches to the minimap bounds.
346. Minimap rendering is capped to 160 items for large boards.
347. Minimap selected items keep their selection styling.
348. Connector rendering continues to cull offscreen lines.
349. Grid rendering remains capped for large viewports.
350. Search now includes hidden collapsed mind-map descendants.
351. Search reveals collapsed mind-map ancestors before focusing a hidden result.
352. Search result metadata marks hidden collapsed-branch results.
353. Search now slices long result lists to 30 items initially.
354. Search now has a Show more action for long lists.
355. Search now has an empty-state guidance card.
356. Files panel selection now centers the canvas on the selected file card.
357. Files panel search now considers the working-file library.
358. Files panel library list no longer stops at the first 8 files.
359. Files panel upload now shows a completion toast.
360. Files panel library placement now shows a placement toast.
361. Files panel upload maps PDFs to PDF cards.
362. Files panel upload maps audio files to audio cards.
363. Files panel upload maps Markdown files to Markdown cards.
364. Files panel library placement maps PDFs to PDF cards.
365. Files panel library placement maps audio files to audio cards.
366. Files panel library placement maps Markdown files to Markdown cards.
367. AddPanel file upload maps PDFs to PDF cards.
368. AddPanel file upload maps audio files to audio cards.
369. AddPanel file upload maps Markdown files to Markdown cards.
370. AddPanel file upload shows a completion toast.
371. AddPanel image placement preserves aspect ratio when dimensions are available.
372. Picked-file metadata now includes human-readable size text on media cards.
373. Safe filename generation now preserves file extensions when truncating.
374. File removal deletes copied local assets when no board or library reference remains.
375. Card deletion deletes copied local assets when no other reference remains.
376. Working-file size estimates now include known file byte sizes.
377. Storage panel now shows working-file counts.
378. Corrupt JSON recovery now writes a timestamped backup key.
379. Saves now also maintain a periodic backup snapshot key.
380. Migration now deduplicates item IDs.
381. Migration now deduplicates board IDs.
382. Migration now clamps item coordinates.
383. Migration now clamps item dimensions.
384. Migration now repairs invalid z-index values.
385. Migration now validates background colors.
386. Migration now validates text colors.
387. Migration now clamps opacity values.
388. Migration now sanitizes drawing point coordinates.
389. Migration now clamps drawing stroke widths.
390. Migration now repairs missing task dependencies.
391. Migration now removes task self-dependencies.
392. Migration now repairs missing mind-map parent IDs.
393. Migration now sanitizes connector-side metadata.
394. Migration now carries URI metadata for PDF/audio/Markdown cards.
395. Migration now carries MIME type metadata for PDF/audio/Markdown cards.
396. Migration now carries size metadata for PDF/audio/Markdown cards.
397. Added migration tests for duplicate ID repair.
398. Added migration tests for broken task dependency repair.
399. Added migration tests for broken mind-map parent repair.
400. Added migration tests for opacity clamping.
401. Added migration tests for drawing-point sanitization.
402. Added migration tests for drawing-width clamping.
403. Toolbar collapsed state now persists.
404. Toolbar side preference now persists.
405. Toolbar now has a visible side-toggle button.
406. Onboarding now sits above bottom controls and toast space.
407. Empty-board prompting is no longer duplicated by the app shell.
408. Splash background color now uses warm cream `#f4ecdd`.
409. App and Android versions are bumped to `1.0.5` and versionCode `6`.
410. Added this implementation log so improvements 211-410 are traceable.
