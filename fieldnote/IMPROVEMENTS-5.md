610. PDF cards now show a branded cover instead of a bare placeholder.
611. PDF cover cards estimate page count from text metadata when present.
612. PDF cover cards estimate page count from file size when metadata is absent.
613. PDF cover cards display the file size using the shared size formatter.
614. PDF reader opens in an in-app modal instead of only deferring to external apps.
615. PDF reader resets to page one whenever a PDF is opened.
616. PDF reader displays current page and total page count.
617. PDF reader includes previous-page navigation.
618. PDF reader includes next-page navigation.
619. PDF reader clamps previous-page navigation at page one.
620. PDF reader clamps next-page navigation at the estimated last page.
621. PDF reader includes zoom-in controls.
622. PDF reader includes zoom-out controls.
623. PDF reader clamps zoom out to a readable minimum.
624. PDF reader clamps zoom in to a bounded maximum.
625. PDF reader shows a page preview stub with the document name.
626. PDF reader shows document descriptive text when available.
627. PDF reader keeps a useful external-open fallback.
628. PDF reader external fallback resolves portable Fieldnote URIs before opening.
629. PDF reader modal exposes a close control with an accessibility label.
630. PDF reader controls use at least 44 px touch targets.
631. PDF reader fallback text explains native search and raster rendering limits.
632. PDF cover copy clarifies the card is a branded preview.
633. PDF modal uses the app overlay and reader shell for consistent contrast.
634. PDF page controls are available without leaving Fieldnote.
635. PDF reader errors fall through to the shared open-file toast.
636. Markdown parser now recognizes one-, two-, and three-level headings.
637. Markdown parser splits content into collapsible sections.
638. Markdown parser retains a default Preview section for headingless files.
639. Markdown previews are capped at 120 KB to protect modal performance.
640. Markdown preview shows an explicit truncation marker when capped.
641. Markdown reader adds in-modal search.
642. Markdown reader filters sections by heading and body text.
643. Markdown reader includes a clear visual search field.
644. Markdown reader keeps section collapse controls.
645. Markdown reader collapse controls include accessibility labels.
646. Markdown rendering handles bullet list lines.
647. Markdown rendering handles numbered list lines.
648. Markdown rendering handles quote lines with a left rule.
649. Markdown rendering strips simple bold markers for preview readability.
650. Markdown rendering strips simple italic markers for preview readability.
651. Markdown reader includes an edit mode.
652. Markdown edit mode writes changes back to the board item.
653. Markdown card metadata shows embedded text size.
654. Markdown empty state distinguishes missing embedded text from blank preview.
655. Markdown search remains indexed through the existing search helper.
656. Markdown file cards keep preview text limited to a few lines.
657. Markdown modal uses readable paper contrast.
658. Markdown edit input uses top-aligned multiline editing.
659. Markdown reader keeps preview and edit modes in one modal.
660. Markdown controls use at least 44 px touch targets.
661. Audio playback resolves portable Fieldnote URIs before loading.
662. Audio playback is wrapped in try/catch for load failures.
663. Audio playback reports load failures on the card.
664. Audio playback reports seek failures on the card.
665. Audio player tracks foreground playback status.
666. Audio player tracks current position.
667. Audio player tracks duration.
668. Audio player pauses any other active Fieldnote audio before playing.
669. Audio player stores the active sound globally for exclusive play.
670. Audio player clears the active sound on unmount.
671. Audio player unloads sounds on unmount.
672. Audio player adds a tappable scrubber.
673. Audio scrubber seeks based on tap location.
674. Audio scrubber uses a 44 px target while preserving the visual bar.
675. Audio player adds 15-second rewind.
676. Audio player adds 15-second forward seek.
677. Audio player clamps seek positions inside duration.
678. Audio controls share the app chip styling.
679. Audio duration display remains stable before metadata loads.
680. Audio status errors no longer crash the card.
681. Working Files now opens as a bottom sheet.
682. Working Files sheet supports a peek height.
683. Working Files sheet supports a half height.
684. Working Files sheet supports a full height.
685. Working Files sheet includes a visible drag handle.
686. Working Files drag gestures promote the sheet upward.
687. Working Files drag gestures demote the sheet downward.
688. Working Files sheet includes explicit peek, half, and full buttons.
689. Working Files sheet resets to half height when opened.
690. Working Files keeps upload support in the new sheet.
691. Working Files keeps folder-card creation in the new sheet.
692. Working Files search filters board files.
693. Working Files search filters the library.
694. Working Files sorts board file cards by display name.
695. Working Files sorts library records by name.
696. Working Files groups board files by type.
697. Working Files groups library files by type.
698. Working Files detects missing device-local board files.
699. Working Files detects missing device-local library files.
700. Working Files marks missing rows with a warning style.
701. Working Files blocks placing a missing library file.
702. Working Files shows a toast when a missing library file is tapped.
703. Working Files preserves locate-and-focus behavior for board files.
704. Working Files preserves remove behavior for library records.
705. Working Files remove buttons use 44 px targets.
706. Working Files sheet backdrop closes the sheet.
707. Working Files sheet copy explains local device storage.
708. Working Files rows keep size and MIME metadata visible.
709. Working Files empty state survives the sheet conversion.
710. Working Files uploads still persist picked assets before placing.
711. Empty board Add prompt is now tappable.
712. Empty board Add prompt opens the Add panel.
713. Empty board Add prompt uses a 44 px target.
714. Empty board Add prompt keeps double-tap guidance.
715. Empty board Add prompt is exposed as a button.
716. Multi-select drag no longer toggles off an already selected card.
717. Multi-select drag still adds an unselected card to the selection.
718. Multi-select drag moves the existing selected group together.
719. Item drag start clears editing state.
720. Connector arrow geometry now follows the actual connector direction.
721. Connector arrows no longer assume horizontal routing.
722. Connector paths keep side-based endpoints.
723. Connector visibility culling remains in place.
724. Dependency completion styling remains intact.
725. Mind-map connectors keep branch colors.
726. Empty Add and connector changes do not alter scientific template count.
727. Scientific method test still requires exactly 19 nodes.
728. Palette Italic now toggles on and off.
729. Palette Italic button shows active state.
730. Palette list formatting still strips existing list prefixes first.
731. Palette bullet list action remains available.
732. Palette numbered list action remains available.
733. Region opacity controls remain available.
734. Region stripe pattern control remains available.
735. Region dot pattern control remains available.
736. Mind-map branch color formatting remains supported.
737. Task priority cycling remains available.
738. Task due-today action remains available.
739. Package export now scans board file items for Fieldnote-managed files.
740. Package export now scans Working Files records for Fieldnote-managed files.
741. Package export uses portable fieldnote-files keys.
742. Package export embeds base64 for files under the 2 MB cap.
743. Package export marks missing blobs as skipped.
744. Package export marks oversize blobs as skipped.
745. Package export marks unreadable blobs as skipped.
746. Package export preserves MIME metadata on blobs.
747. Package export preserves size metadata on blobs.
748. Package export reports how many blobs were embedded.
749. Package payload still stores portable board item URIs.
750. Package payload still stores portable working file URIs.
751. Package parser now returns sanitized blob metadata.
752. Package parser rejects unsupported package format names.
753. Package parser ignores invalid blob keys outside fieldnote-files.
754. Package parser ignores blobs without base64 or skipped status.
755. Package parser keeps legacy board JSON import support.
756. Package import writes embedded base64 blobs to fieldnote-files.
757. Package import restores board item URIs from portable paths.
758. Package import restores working file URIs from portable paths.
759. Package import deduplicates working files by hydrated URI.
760. Package import keeps conflict-safe board naming.
761. Package import reports when embedded files were restored.
762. Package import remains async so files are written before insertion.
763. Package blob writes validate the portable path prefix.
764. Package blob writes create the files directory as needed.
765. Package blob reads resolve portable URIs before reading.
766. Package blob reads enforce the 2 MB cap.
767. Package blob reads skip missing files instead of throwing to the user.
768. Clipboard paste now checks the system clipboard when local copy is empty.
769. Clipboard paste accepts Fieldnote item JSON.
770. Clipboard paste accepts Fieldnote package JSON.
771. Clipboard paste places JSON at the requested center when provided.
772. Clipboard paste hydrates package item URIs before placing.
773. Clipboard paste shows a success toast for Fieldnote JSON.
774. Clipboard paste shows clearer guidance when nothing usable is copied.
775. Open URI now resolves portable Fieldnote paths everywhere through context.
776. Image cards resolve portable Fieldnote paths before display.
777. Audio cards resolve portable Fieldnote paths before playback.
778. PDF external open resolves portable Fieldnote paths.
779. Working Files existence checks resolve portable Fieldnote paths.
780. File persistence helpers expose a shared package blob size cap.
781. File persistence helpers expose portable blob keys.
782. File persistence helpers expose base64 reads.
783. File persistence helpers expose base64 writes.
784. File persistence helpers preserve existing human size formatting.
785. Storage backup flow remains compatible with the new package import path.
786. Migration parser still sanitizes file sizes.
787. Migration parser still repairs duplicate IDs.
788. Migration parser still repairs broken graph references.
789. Migration parser still clamps region opacity.
790. Search continues to include Markdown body text.
791. Search continues to include file names and MIME metadata.
792. Search results can still reveal hidden mind-map paths.
793. Context value is now memoized.
794. Context memoization includes connection state.
795. Context memoization includes clipboard availability.
796. Context memoization includes working files.
797. Context memoization includes history availability.
798. Context memoization includes all exposed actions.
799. Modal close controls keep accessibility labels.
800. New reader controls use button accessibility labels.
801. New sheet controls use button accessibility labels.
802. New toast paths avoid crashing on file-system failures.
803. Version in package.json is bumped to 1.0.7.
804. Version in package-lock.json is bumped to 1.0.7.
805. Version in app.json is bumped to 1.0.7.
806. Android versionCode is bumped to 8.

807. No EAS build was started for these improvements.
