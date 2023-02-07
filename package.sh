# Version Bump Instructions:
# 0. Create release/vX.X.X branch
# 1. Find-all-replace old version number with new version number (except in CHANGELOG file), update CHANGELOG, and push to github (needed for activelinks.json)
# 2. Run `web-ext build -i data icons/outline.sh package.sh` (note: `-i` flag means "ignore") (or maybe just do step 4 instead?)
# 3. Upload .zip to Firefox add-on developer dashboard to get a .xpi file and save it to the `web-ext-artifacts` folder.
#     Note: it might take a couple minutes for the .zip file in "Files" to get changed to a .xpi file.
# 4. Run this script.  (It's ok if you run it before steps 0-3; it won't delete anything important, just run it again now)
# 5. Test zip file in chrome at a minimum.  If everything works well, tag this commit, `git push --tags`, and merge back into master.
# 6. Create version on github.  Upload the 3 github-artifacts.
# 7. Upload to chrome, firefox, and edge stores.  Badges should update automatically.

version=$(gsed -n 's/^.*"version": "\(.*\)",/\1/p' manifest.json)
echo "Version: $version"
fname="web-ext-artifacts/sci-hub_x_now_-${version}.zip"
echo "zipping archive for chrome: $fname"
git archive -v --worktree-attributes -o $fname HEAD

# This zip archive can be used for chrome and edge.

# Theoretically, `web-ext sign` should sign it for firefox, but it's really slow and only
# lets you do it once so it's easier to just manually upload it to the firefox store and
# download the .xpi artifact from there.

# web-ext build -i data icons/outline.sh package.sh
# web-ext sign

# github artifacts:
cp $fname "github-artifacts/sci-hub-now_v${version}_chrome.zip"
cp $fname "github-artifacts/sci-hub-now_v${version}_edge.zip"
firefoxname="github-artifacts/sci_hub_x_now-${version}-an+fx.xpi"
cp "web-ext-artifacts/sci_hub_x_now-${version}-an+fx.xpi" \
   "github-artifacts/sci-hub-now_v${version}_firefox.xpi"
