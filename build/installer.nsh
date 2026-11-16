; Token Huddle's additions to electron-builder's NSIS installer.

; Disconnect on uninstall: start the app once with --uninstall-cleanup so it
; removes its own Claude Code status line and its "Start with Windows" entry.
; customUnInstall runs after the uninstaller has closed a running Token Huddle
; and before it deletes $INSTDIR, so the .exe still exists here. Skipped when
; the uninstall is part of an upgrade (installing a newer version over this
; one), or every update would disconnect Claude Code. The app always exits 0.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --uninstall-cleanup'
  ${endIf}
!macroend
