[Setup]
AppId=dsantananet.IgnisPyroMeteo
AppName=IgnisPyroMeteo
AppVersion=1.2.0-rc.1
AppPublisher=dsantananet
DefaultDirName={localappdata}\Programs\IgnisPyroMeteo
DefaultGroupName=IgnisPyroMeteo
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
UninstallDisplayIcon={app}\IgnisPyroMeteo.exe
SetupIconFile=app.ico
OutputDir=..\release
OutputBaseFilename=IgnisPyroMeteo-1.2.0-rc.1-windows-x64-setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
WizardImageFile=wizard.bmp
WizardSmallImageFile=wizard-small.bmp
[Files]
Source: "..\dist-current\IgnisPyroMeteo\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\IgnisPyroMeteo"; Filename: "{app}\IgnisPyroMeteo.exe"
[Run]
Filename: "{app}\IgnisPyroMeteo.exe"; Description: "Abrir IgnisPyroMeteo"; Flags: nowait postinstall skipifsilent
