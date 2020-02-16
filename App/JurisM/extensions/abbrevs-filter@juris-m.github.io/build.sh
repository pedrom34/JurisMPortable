#!/bin/bash

set -e

# Release-dance code goes here.

# Constants
PRODUCT="Juris-M Abbreviation Filter: abbreviation list editing and maintenance"
IS_BETA="false"
FORK="abbrevs-filter"
BRANCH="af5"
CLIENT="abbrevs-filter"
VERSION_ROOT="2.1."
SIGNED_STUB="juris_m_abbreviation_filter-"

set +e
gsed --version > /dev/null 2<&1
if [ $? -gt 0 ]; then
    GSED="sed"
else
    GSED="gsed"
fi
set -e


function build-the-plugin () {
    set-install-version
    find . -name '.gitmodules' -prune -o \
        -name '.gitignore' -prune -o \
        -name '*~' -prune -o \
        -name '.git' -prune -o \
        -name 'attic' -prune -o \
        -name 'docs' -prune -o \
        -name 'tools' -prune -o \
        -name '*.bak' -prune -o \
        -name '*.tmpl' -prune -o \
        -name 'version' -prune -o \
        -name 'releases' -prune -o \
        -name 'jm-sh' -prune -o \
        -name 'index.js' -prune -o \
        -name 'package.json' -prune -o \
        -name 'test' -prune -o \
        -name 'update-TEMPLATE.rdf' -prune -o \
        -name 'build.sh' -prune -o \
        -print | xargs zip "${XPI_FILE}" >> "${LOG_FILE}"
    }
    
. jm-sh/frontend.sh
