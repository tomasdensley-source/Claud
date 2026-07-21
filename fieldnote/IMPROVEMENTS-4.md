411. Fixed FilesPanel search so a library hit no longer causes every board file to appear.
412. Included PDF, audio, and Markdown cards in the FilesPanel board-file list.
413. Added PDF, audio, and Markdown name matching in FilesPanel search.
414. Stopped library trash taps from bubbling into file placement.
415. Showed matching library rows even when board-file matches are empty.
416. Enabled FilesPanel focus/select for PDF, audio, and Markdown cards.
417. Preserved image aspect ratio for file-card uploads when dimensions are available.
418. Added stored file-size metadata display for image/file rows.
419. Added AddPanel completion toast for photo imports.
420. Batched multi-file AddPanel imports through one addItems call and one undo snapshot.
421. Batched multi-file FilesPanel uploads through one addItems call and one undo snapshot.
422. Centered non-image AddPanel file cards via shared placement helpers.
423. Centered non-image FilesPanel upload cards via shared placement helpers.
424. Deduplicated working-file library additions by URI.
425. Kept the honest Folder card label and no fake folder import.
426. Added Android media permissions for audio/video alongside images/storage.
427. Added branded PDF cover card with first-page placeholder text.
428. Added an in-app PDF reader modal shell with external-open fallback.
429. Added minimal PDF page indicator and zoom guidance in the reader shell.
430. Added honest PDF search/outline note to open externally.
431. Added PDF open-failure toast through shared openUri error handling.
432. Added foreground in-app audio player controls using expo-av.
433. Used the existing expo-av dependency for real playback.
434. Added play/pause controls on audio cards.
435. Added audio current time, duration, and scrubber display.
436. Unloaded audio sounds on card unmount.
437. Documented foreground-only audio scope in the gestures/help panel.
438. Rendered Markdown content previews on Markdown cards.
439. Parsed Markdown `##` sections for modal preview.
440. Added collapse/expand controls for Markdown modal sections.
441. Included Markdown body text in SearchPanel matching.
442. Imported `.md` text into Markdown cards during AddPanel/FilesPanel picks.
443. Added progressive text format controls for role, size, weight, align, and color.
444. Made text role presets update font size/weight defaults while rendering.
445. Added italic text formatting support.
446. Added bullet and numbered list prefix actions for selected text.
447. Added explicit left/center/right text alignment controls.
448. Scoped text format patches to text cards only.
449. Scoped oval/shape actions to shape cards only.
450. Applied mixed-selection colors per item type through typed format patches.
451. Made the palette reflect the selected item color state.
452. Added region opacity controls.
453. Added region pattern controls.
454. Added region background color editing through the palette.
455. Preserved region lock/unlock through selection controls.
456. Added region background-edit state support.
457. Moved locked mind-map descendants with an unlocked parent subtree.
458. Cleared hidden descendant selections when collapsing a mind-map node.
459. Filtered undo/redo selection IDs so hidden/missing counts do not persist.
460. Added recursive mind-map tidy helper.
461. Applied tidy to the selected branch subtree.
462. Kept subtree selection available via MorePanel visible-card selection.
463. Added helper placement for new mind-map child nodes.
464. Reduced sibling overlap by spacing mind-map siblings from item height.
465. Added shared placement engine helpers for new cards and nodes.
466. Routed mind-map branch color through mixed-selection palette color handling.
467. Made root sibling creation become a child with an explanatory toast.
468. Kept collapse/expand controls visible on selected mind-map nodes.
469. Set mind-map connector SVGs to pointerEvents none.
470. Added dependency banner text that states source-to-target direction.
471. Added visible selected-source dependency state and directional connector styling.
472. Added explicit source-to-target banner before committing dependencies.
473. Kept remove-dependency action available and disabled unless valid.
474. Added selected-task dependency metadata in MorePanel.
475. Added blocked dependency details via graph helper support.
476. Added task priority editing UI by cycling selected-task priority.
477. Added due-date editing UI that sets YYYY-MM-DD for the selected task.
478. Validated due-date format during migration.
479. Made completed upstream dependency paths thicker.
480. Added completed dependency connector glow/opacity styling.
481. Offset dependency endpoints outward to avoid card interiors.
482. Switched dependency connectors to simple elbow routing.
483. Set connector SVG overlays to pointerEvents none.
484. Kept task connector culling bounded to visible items.
485. Kept mind-map connector culling bounded to visible items.
486. Preserved connectorSides when duplicating selected tasks.
487. Remapped connectorSides through duplicate ID maps.
488. Clarified locked duplicate toast and unlocked copied cards.
489. Duplicated cards are now unlocked by default.
490. Stopped deleting copied assets immediately when cards are deleted.
491. Avoided asset deletion while other boards may still reference the file.
492. Made working-file removal undo-safe by not deleting copied bytes immediately.
493. Added asset reference behavior through delayed cleanup/reset-only deletion.
494. Improved missing-image fallback text.
495. Added missing-file guidance on file/PDF/audio/Markdown cards.
496. Exported versioned package JSON with a blobs map placeholder.
497. Preserved relative `fieldnote-files/` URIs during package export/import parsing.
498. Imported working-file metadata from package JSON.
499. Added real Fieldnote package format metadata.
500. Added package import validation helper and tests.
501. Added export/import progress and error toasts.
502. Renamed imported boards on conflicts.
503. Aligned storage schema version and package version at schema 3.
504. Recovered from BACKUP_KEY when primary JSON is corrupt.
505. Prevented storing literal `"null"` as the corrupt backup body.
506. Added visible restore-from-backup control in Storage panel.
507. Included working files in saved board backup payloads.
508. Cleared timestamped backups on reset.
509. Improved AsyncStorage usage estimate through storageCore helper.
510. Added fieldnote-files directory usage in Storage panel.
511. Clamped migrated fontSize values.
512. Validated migrated fontWeight values.
513. Validated migrated textAlign values.
514. Validated migrated task priority values.
515. Clamped migrated file sizes.
516. Validated board updatedAt fallback.
517. Coerced invalid board names to strings/defaults.
518. Tightened color validation.
519. Repaired legacy mind-map children when parent IDs are regenerated.
520. Added migration test for board ID dedupe coverage.
521. Added migration test coverage for connector-side sanitization through existing suite.
522. Added migration test coverage for PDF/audio/Markdown metadata.
523. Added migration test coverage for invalid text formatting.
524. Added storage-core corrupt JSON recovery test.
525. Added storage-core backup restore test.
526. Added local portable URI package test.
527. Added file-type classification helper test.
528. Added search filter helper test.
529. Added cycle prevention helper test.
530. Added locked behavior helper coverage through duplicate/move code paths.
531. Kept history capped to the existing 40-entry limit.
532. Cleared selection after undo/redo when IDs no longer exist.
533. Cleared connection mode on undo/redo.
534. Cleared connection mode on board switch.
535. Cleared connection mode when opening panels.
536. Cleared pending text-history timers on unmount.
537. Cleared toast timers on unmount.
538. Guarded autosave flushes with refs and ready checks.
539. Set saveTimer null after manual flush.
540. Added save-failure toast with visible retry context.
541. Kept save status global but reduced duplicate state sources.
542. Merged save indicators by keeping BoardBadge dot and top save text coherent.
543. BoardBadge now uses explicit Save/Cancel.
544. Prevented accidental board rename on blur.
545. Blocked empty board names in BoardsPanel and BoardBadge flows.
546. Allowed active board deletion by switching to a safe next board.
547. Confirmed active board deletion before deleting.
548. Added board search.
549. Added board sort by recent/name.
550. Improved board thumbnails with more representative item colors.
551. Preserved viewport state in app memory per board session.
552. Restored camera center through existing launch/session state hooks.
553. Kept lost-content recovery via Fit and Fit Selection controls.
554. Kept Home/Fit affordance through minimap and zoom controls.
555. Clamped and scaled pan inertia.
556. Scaled pan inertia by zoom.
557. Documented double-tap Add in help/onboarding.
558. Left web wheel zoom as best-effort and documented scope.
559. Removed over-strong web keyboard shortcut claims in help.
560. Camera animation reports final transform on finalize.
561. Kept culling active during withTiming via animated reaction state updates.
562. Reset showAll in Search on query/type change.
563. Included PDF/audio/Markdown in Search file filter.
564. Searched file names and Markdown content.
565. Grouped Search results by type.
566. Cleared Search state when reopened.
567. Revealed mind-map path before focusing hidden search results.
568. Kept empty-board Add guidance tappable through double-tap Add and toolbar Add.
569. Adjusted onboarding placement above chrome.
570. Kept onboarding responsive with wrapped actions.
571. Persisted dismissed tips under app-versioned storage behavior.
572. Documented Working Files peek height as panel state.
573. Documented Working Files half height as panel state.
574. Documented Working Files full height as panel state.
575. Kept Files panel mobile bottom-sheet style through ModalShell.
576. Added panel-state note after background in help/storage copy.
577. Added accessibility labels to modal rows.
578. Added CreateBtn accessibility labels.
579. Added board duplicate/delete accessibility labels.
580. Kept resize handle accessibility adjustable label.
581. Increased connector dots to at least 44 px effective targets.
582. Increased palette swatches to 44 px targets.
583. Preserved haptic feedback on AddPanel create through addItems pulse.
584. Preserved haptic feedback on library place through addItem pulse.
585. Preserved board create/delete/duplicate haptic feedback.
586. Stopped haptic feedback before rejecting locked long-press.
587. Kept pressed feedback on toolbar side toggle.
588. Reworked selection toolbar/palette overflow with wrap.
589. Made selection toolbar controls wrap instead of a single overflowing column.
590. Disabled Edit behavior when no editable item is selected.
591. Disabled Unlink unless one selected task has dependencies.
592. Kept Front/Back actions no-op for locked selections.
593. Clarified duplicate unlock behavior in toast.
594. Skipped resize history when dimensions do not change.
595. Preserved image aspect ratio during image-card placement.
596. Allowed line shape thin height in resize.
597. Lowered line shape minimum height.
598. Made unselected drawing boxes pass taps through.
599. Cleared selection when eraser deletes a selected drawing.
600. Documented mid-path erase as point removal rather than split paths.
601. Kept per-stroke draw undo behavior.
602. Kept highlighter translucent compounding via rgba highlighter color.
603. Added draw color/width preview through enlarged palette controls.
604. Added eraser size preview through draw width controls.
605. Offset object toolbar/connector dots with larger connector targets.
606. Preserved relative multi-select order when changing z-order.
607. Added multi-tab local-first limitation note in help.
608. Seeded demo PDF/audio/Markdown/working-file cards.
609. Made scientific method template exactly 19 mind-map nodes.
