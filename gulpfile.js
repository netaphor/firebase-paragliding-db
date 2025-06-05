const { src, dest, watch, series, parallel } = require('gulp');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const uglify = require('gulp-uglify-es').default;
const rename = require('gulp-rename');
const rev = require('gulp-rev-fork');
const fs = require('fs/promises'); // For manual file writing
const path = require('path');
const through = require('through2'); // For intercepting the manifest file object
require('dotenv').config();

// --- Configuration ---

const MANIFEST_FILENAME = 'rev-manifest.json';

// Determine the environment (e.g., 'development' or 'production')
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Building for: ${isProduction ? 'Production' : 'Development'}`);

const paths = {
    styles: {
        src: 'src/**/*.css', // Source for plain CSS files
        dest: 'public/css/' // Destination for processed CSS files
    },
    scripts: {
        src: 'src/**/*.js', // Source for JavaScript files
        dest: 'public/script/' // Destination for processed JS files
    },
    manifestTempDest: './', // Temporary location for manifest (project root)
    manifestFinalDest: 'functions/', // Final destination for manifest (Firebase Functions folder)
    publicBase: 'public/' // Base path for assets inside the manifest and for rev() output
};

// --- Gulp Tasks ---

// CSS Task: Processes and outputs CSS files
function styles() {
    let stream = src(paths.styles.src)
        .pipe(postcss([
            autoprefixer(),
            cssnano() // Minify CSS
        ]));

    if (!isProduction) {
        // Only rename for development builds to add .min suffix
        stream = stream.pipe(rename({ suffix: '.min' }));
    }
    return stream.pipe(dest(paths.styles.dest));
}

// JavaScript Task: Processes and outputs JS files
function scripts() {
    let stream = src(paths.scripts.src)
        .pipe(uglify()); // Minify JS

    if (!isProduction) {
        // Only rename for development builds to add .min suffix
        stream = stream.pipe(rename({ suffix: '.min' }));
    }
    return stream.pipe(dest(paths.scripts.dest));
}

// Revision Task: Hashes files, writes hashed files, and manually generates the manifest
// Revision Task (Explicitly waits for manual manifest write to finish)
function revision() {
    if (!isProduction) {
        return Promise.resolve(); // Skip revisioning in development
    }

    console.log('--- Entering revision task to hash files and generate manifest ---');
    const absoluteManifestPath = path.join(process.cwd(), paths.manifestTempDest, MANIFEST_FILENAME);

    // This promise will resolve when the manifest has been successfully written
    const manifestWritePromise = new Promise((resolveWrite, rejectWrite) => {
        src([paths.styles.dest + '**/*.css', paths.scripts.dest + '**/*.js'], { base: paths.publicBase })
            .pipe(rev()) // Apply hashing
            .pipe(dest(paths.publicBase)) // Write hashed files back to public/
            .pipe(rev.manifest(MANIFEST_FILENAME, { // Generate the manifest Vinyl file object
                base: paths.publicBase,
                merge: true
            }))
            // Intercept the manifest Vinyl file and write its content manually using fs.writeFile
            .pipe(through.obj(function (file, enc, cb) {
                if (file.isNull() || file.isStream()) {
                    return cb(new Error('Manifest file not found or is a stream. Cannot write.'));
                }

                fs.writeFile(absoluteManifestPath, file.contents, 'utf8')
                    .then(() => {
                        console.log(`Manual write SUCCESS: Manifest file written to ${absoluteManifestPath}`);
                        resolveWrite(); // RESOLVE THE MANIFEST WRITE PROMISE HERE
                        cb(null, file); // Continue the stream
                    })
                    .catch(err => {
                        console.error(`Manual write FAILURE: Error writing manifest to ${absoluteManifestPath}:`, err);
                        rejectWrite(err); // REJECT THE MANIFEST WRITE PROMISE HERE
                        cb(err); // Pass error down the stream
                    });
            }))
            .on('end', () => {
                // This 'end' may fire before fs.writeFile completes, so we rely on resolveWrite above.
                console.log('Main revision stream (excluding manual write) ended.');
            })
            .on('error', (err) => {
                console.error('Error in revision task pipeline (before manual write):', err);
                rejectWrite(err); // Ensure promise is rejected on earlier errors
            });
    });

    return manifestWritePromise; // Return the promise for Gulp to wait on
}

// Copy Manifest Task: Copies the manifest from its temporary location to its final destination
function copyManifest() {
    if (!isProduction) {
        return Promise.resolve(); // Only do this in production
    }
    console.log(`--- Copying manifest from ${paths.manifestTempDest} to ${paths.manifestFinalDest} ---`);

    const sourceManifestPath = path.join(process.cwd(), paths.manifestTempDest, MANIFEST_FILENAME);

    // Ensure the source file exists before attempting to pipe
    return new Promise((resolve, reject) => {
        fs.access(sourceManifestPath, fs.constants.F_OK)
            .then(() => {
                console.log(`Manifest file confirmed present for copy: ${sourceManifestPath}`);
                src(sourceManifestPath)
                    .pipe(dest(paths.manifestFinalDest))
                    .on('end', () => {
                        console.log(`Manifest copied to: ${path.join(process.cwd(), paths.manifestFinalDest, MANIFEST_FILENAME)}`);
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Error copying manifest:', err);
                        reject(err);
                    });
            })
            .catch(err => {
                console.error(`ERROR: Manifest file NOT found at ${sourceManifestPath} for copy:`, err);
                reject(new Error(`Manifest file not found at ${sourceManifestPath} for copy.`));
            });
    });
}

// Cleanup Unhashed Task: Removes original (unhashed) files after revisioning
async function cleanupUnhashed() {
    if (!isProduction) {
        return Promise.resolve(); // Only do this in production
    }
    console.log('--- Cleaning up unhashed intermediate files ---');

    const manifestPath = path.join(process.cwd(), paths.manifestTempDest, MANIFEST_FILENAME);
    let manifest;

    try {
        manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    } catch (err) {
        console.warn('Could not read manifest for unhashed cleanup, skipping specific cleanup:', err.message);
        return Promise.resolve(); // Cannot clean without manifest
    }

    const unhashedFilesToDelete = [];
    const { deleteAsync } = await import('del');

    for (const originalRelativePath in manifest) {
        if (manifest.hasOwnProperty(originalRelativePath)) {
            const originalFullPath = path.join(process.cwd(), paths.publicBase, originalRelativePath);

            try {
                await fs.access(originalFullPath, fs.constants.F_OK); // Check if the unhashed file still exists
                // Ensure we are deleting the ORIGINAL unhashed file, not a hashed one or the manifest itself.
                if (!originalRelativePath.includes('-') && originalRelativePath !== MANIFEST_FILENAME) {
                    unhashedFilesToDelete.push(originalFullPath);
                }
            } catch (error) {
                // File does not exist, so nothing to delete. (Expected for already replaced files).
            }
        }
    }

    const uniqueFilesToDelete = [...new Set(unhashedFilesToDelete)]; // Ensure uniqueness

    if (uniqueFilesToDelete.length > 0) {
        await deleteAsync(uniqueFilesToDelete);
        console.log('Removed unhashed intermediates:', uniqueFilesToDelete.map(f => path.relative(process.cwd(), f)));
    } else {
        console.log('No unhashed intermediate files found for removal.');
    }
}

// Clean Task: Deletes all previous build outputs at the start of the build process
async function clean() {
    const { deleteAsync } = await import('del');
    console.log('--- Cleaning build directories ---');
    return deleteAsync([
        'public/css/*', // Clear processed CSS
        'public/script/*', // Clear processed JS
        path.join(paths.manifestTempDest, MANIFEST_FILENAME), // Clear manifest from temp location
        path.join(paths.manifestFinalDest, MANIFEST_FILENAME)  // Clear manifest from final location
    ]);
}

// Watch Task: Watches source files for changes during development
function watchFiles() {
    watch(paths.styles.src, styles);
    watch(paths.scripts.src, scripts);
}

// --- Gulp Build Flows ---

// Build Task: Defines the complete production build process
const build = series(
    clean,                     // 1. Clean all previous build artifacts
    parallel(styles, scripts), // 2. Process CSS and JS (outputting unhashed versions to public/)
    revision,                  // 3. Hash files, write hashed versions, and create manifest in root
    cleanupUnhashed,           // 4. Remove the original unhashed files from public/
    copyManifest               // 5. Copy the manifest from root to functions/
);

// Default Task: Runs the build process and then starts watching for changes (for development)
exports.default = series(build, watchFiles);

// --- Exports for Firebase CLI ---

// Export individual tasks for specific use if needed (e.g., in package.json scripts)
exports.styles = styles;
exports.scripts = scripts;
exports.build = build; // Export the full build task for production deployment
exports.revision = revision;
exports.copyManifest = copyManifest;
exports.cleanupUnhashed = cleanupUnhashed;