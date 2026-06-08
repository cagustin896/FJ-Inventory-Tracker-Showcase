Dim objShell, fso, projectDir, quote, command

Set objShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
quote = Chr(34)

' Restart the PM2-managed app from this project folder.
command = "cmd /c cd /d " & quote & projectDir & quote & " && pm2 restart fj-inventory > " & quote & projectDir & "\server.log" & quote & " 2>&1"
objShell.Run command, 0, True

MsgBox "F&J Inventory server restarted." & Chr(13) & "You can now open the app.", 64, "F&J Inventory"
