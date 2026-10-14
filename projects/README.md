# Editable template projects

`<client>/<template>.jarrang.json` is the editable project for that suite. Use **Open repository** in Studio after pulling in Tower. **Save** writes the current module's generated files and the complete editable project; **Save template** updates all modules in that template.

Other module drafts can be present in the JSON without having updated their generated pages. Preserve the per-module exported references and commit the JSON together with the generated files. The adjacent `*-PUBLISHING.md` is generated deployment guidance, not a second source of module content.

See the [user guide](../USER_GUIDE.md) for editing and the [technical guide](../DEVELOPER_GUIDE.md) for file/data contracts. These files are outside the Pages publishing folder, but are readable by anyone with repository access.
