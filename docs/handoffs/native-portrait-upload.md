# Native portrait upload failure (Expo 57)

- Reproduced on attached Vivo V2058: picking repository portrait fixture displayed the image but immediately failed with the generic connection error; normal authenticated profile requests worked.
- Expo 57 installs `expo/fetch` globally. Its multipart converter rejects legacy `{uri,name,type}` objects (`Unsupported FormDataPart implementation`), which the shared API wrapper previously presented as a network failure.
- `imageBody` now appends an `expo-file-system` File, validates actual file size/type, and leaves web file/blob behavior intact. This fixes the shared multipart construction for portrait, cover and general image uploads.
- Added direct `expo-file-system ~57.0.7` dependency matching the already installed native library; lock update adds only the root dependency.
- Regression runs the installed Expo multipart converter against the actual helper body and verifies bytes reach encoded multipart. Failed before fix, then passed. All 138 Node tests and TypeScript passed.
- Live native recheck now reaches Render and receives a Gemini backend error, proving the client transport issue is resolved. No confirmation or profile save was performed.
- Second root cause in BE: Gemini 3.8 rejects `thinking_level=minimal` (live HTTP 400). BE uses `low` now; deployment to Render is needed. Direct corrected calls currently receive provider overload 503, so successful live cutout remains unverified.
- Temporary diagnostic code removed. Original account/profile data remains unchanged.
- Sources: https://docs.expo.dev/versions/latest/sdk/filesystem/#uploading-files-using-expofetch and installed `expo/src/winter/fetch/convertFormData.ts`.
