"""Windows Credential Manager storage, scoped to the signed-in Windows user."""
import ctypes
import os
from ctypes import wintypes

TARGET='IgnisPyroMeteo/IALDEI10'
class Credential(ctypes.Structure):
    _fields_=[('Flags',wintypes.DWORD),('Type',wintypes.DWORD),('TargetName',wintypes.LPWSTR),('Comment',wintypes.LPWSTR),('LastWritten',wintypes.FILETIME),('CredentialBlobSize',wintypes.DWORD),('CredentialBlob',ctypes.POINTER(ctypes.c_byte)),('Persist',wintypes.DWORD),('AttributeCount',wintypes.DWORD),('Attributes',ctypes.c_void_p),('TargetAlias',wintypes.LPWSTR),('UserName',wintypes.LPWSTR)]

def read_key():
    if os.name!='nt':return None
    api=ctypes.WinDLL('Advapi32.dll');ptr=ctypes.POINTER(Credential)()
    if not api.CredReadW(TARGET,1,0,ctypes.byref(ptr)):return None
    try:return ctypes.string_at(ptr.contents.CredentialBlob,ptr.contents.CredentialBlobSize).decode('utf-8')
    finally:api.CredFree(ptr)

def save_key(key):
    data=key.encode('utf-8');blob=(ctypes.c_byte*len(data)).from_buffer_copy(data)
    credential=Credential(Type=1,TargetName=TARGET,CredentialBlobSize=len(data),CredentialBlob=blob,Persist=2,UserName='IALDEI10')
    if not ctypes.WinDLL('Advapi32.dll').CredWriteW(ctypes.byref(credential),0):raise OSError('Could not store station credential')
