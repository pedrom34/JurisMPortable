#!/usr/bin/python

import sys,os,json

scriptPath = os.path.os.path.split(os.path.abspath(__file__))[0]
abbrevsPath = os.path.join(scriptPath, '..', 'resource', 'abbrevs')

class Normalize:
    def __init__(self):
        pass

    def run(self):
        dirlist = []
        for file in os.listdir(abbrevsPath):
            if not file.endswith('.json'): continue
            if file == 'DIRECTORY_LISTING.json': continue
            sys.stdout.write('File: %s: ' % file)
            obj = json.loads(open(os.path.join(abbrevsPath,file)).read())
            if not obj.has_key('name'):
                print "Error: missing name in %s" % file
                sys.exit()
            if not obj.has_key('version'):
                print "Error: missing version in %s" % file
                sys.exit()
            obj['filename'] = file
            sys.stdout.write('%s\n' % obj['name'])
            str = json.dumps(obj,indent=2,sort_keys=True,ensure_ascii=False)
            open(os.path.join(abbrevsPath,file),'w+').write(str)
            info = {}
            info['filename'] = file
            info['name'] = obj['name']
            info['version'] = obj['version']
            dirlist.append(info)

        def sortFunc(a,b):
            if a['name'] > b['name']:
                if a['name'].find('EMPTY') == -1 and b['name'].find('EMPTY') > -1:
                    return -1
                return 1
            elif a['name'] < b['name']:
                return -1
            else:
                return 0
            
        dirlist.sort(sortFunc)
        dirstr = json.dumps(dirlist,indent=2,sort_keys=True,ensure_ascii=False)
        open(os.path.join(abbrevsPath,'DIRECTORY_LISTING.json'),'w+').write(dirstr)

class Curate:
    def __init__(self, srcFileName, targets):
        self.msg = "Curate must be subclassed. No action on this file: %s"
        srcPath = os.path.join(abbrevsPath, srcFileName)
        self.srcPath = srcPath
        if not os.path.exists(srcPath):
            print 'Error: file "%s" does not exist.\nAborting.' % srcFileName
            sys.exit()
        print "Loading source: %s" % srcFileName
        self.src = json.loads(open(srcPath).read())
        self.srcTop = json.loads(open(srcPath).read())
        self.src = self.srcTop['xdata']
        self.srcTop['filename'] = srcFileName
        self.targets = [];
        self.targetsTop = [];
        prefixes = targets.split(',')
        for fileName in os.listdir(abbrevsPath):
            if not fileName.endswith('.json'): continue
            if fileName == srcFileName: continue
            for prefix in prefixes:
                if len(prefix) < 2: continue
                if not fileName.startswith(prefix): continue
                targetPath = os.path.join(abbrevsPath,fileName)
                print "Loading target: %s" % fileName
                targetTop = json.loads(open(targetPath).read())
                targetTop['filename'] = fileName
                self.targetsTop.append(targetTop)
                self.targets.append(targetTop['xdata'])
        print "===="

    def run(self):
        print self.msg
        print '  source: %s' % self.srcTop['filename']
        for targetTop in self.targetsTop:
            print '  target: %s' % targetTop['filename']
        self.count = 0
        self.keylist = []
        self.ret = False
        for srcJur in self.src:
            self.jurInspect(srcJur)
            for srcSeg in self.src[srcJur]:
                for srcKey in self.src[srcJur][srcSeg]:
                    srcVal = self.src[srcJur][srcSeg][srcKey]
                    for i in range(0,len(self.targets),1):
                        targ = self.targets[i]
                        targName = self.targetsTop[i]['filename']
                        for targJur in targ:
                            for targSeg in targ[targJur]:
                                self.keyInspect(srcJur,srcSeg,srcKey,targJur,targSeg)
                                for targKey in targ[targJur][targSeg]:
                                    self.keyCompare(targName,targ,srcJur,srcSeg,srcKey,targJur,targSeg,targKey)

        for keys in self.keylist:
            self.keyAction(keys)

        self.finish()

    def keyInspect(self,srcJur,srcSeg,srcKey,targJur,targSeg):
        pass

    def keyCompare(self,targName,targ,srcJur,srcSeg,srcKey,targJur,targSeg,targKey):
        pass

    def jurInspect(self,srcJur):
        pass

    def keyAction(self,keys):
        pass

    def finish(self):
        pass

class FindConflicts(Curate):
    def __init__(self, srcFilename, targets):
        Curate.__init__(self, srcFilename, targets)
        self.msg = 'Checking source for conflicts with targets'

    def keyCompare(self,targName,targ,srcJur,srcSeg,srcKey,targJur,targSeg,targKey):
        if srcJur == targJur and srcSeg == targSeg and srcKey == targKey:
            srcVal = self.src[srcJur][srcSeg][srcKey]
            targVal = targ[targJur][targSeg][targKey]
            if srcVal != targVal:
                print '  While processing target: %s' % targName
                print "    Mismatch on [%s]/[%s]/[%s]: %s -VS- %s" % (srcJur,srcSeg,srcKey,srcVal,targVal) 
                self.ret = True
            else:
                self.count += 1

    def finish(self):
        print "Found %d items for purging" % self.count
        return self.ret

class PurgeFromSource(Curate):
    def __init__(self, srcFilename, targets):
        Curate.__init__(self, srcFilename, targets)
        self.msg = 'Purging from source based on comparison with targets'

    def keyCompare(self,targName,targ,srcJur,srcSeg,srcKey,targJur,targSeg,targKey):
        if srcJur == targJur and srcSeg == targSeg and srcKey == targKey:
            srcVal = self.src[srcJur][srcSeg][srcKey]
            targVal = targ[targJur][targSeg][targKey]
            if srcVal == targVal:
                self.keylist.append([srcJur,srcSeg,srcKey])

    def keyAction(self,keys):
        srcJur = keys[0]
        srcSeg = keys[1]
        srcKey = keys[2]
        if self.src[srcJur][srcSeg].has_key(srcKey):
            print '  Purging: [%s]/[%s]/[%s]' % (srcJur,srcSeg,srcKey)
            self.src[srcJur][srcSeg].pop(srcKey)

    def finish(self):
        if len(self.keylist):
            open(self.srcPath,'w+').write(json.dumps(self.srcTop,indent=2,sort_keys=True,ensure_ascii=False))


class MoveToTarget(Curate):
    def __init__(self, srcFilename, targets, jurisdictionFilter):
        Curate.__init__(self, srcFilename, targets)
        self.jurisdictionFilter = jurisdictionFilter
        self.msg = 'Moving from source to target, filtering on "%s"' % jurisdictionFilter

    def jurInspect(self,srcJur):
        if srcJur.startswith(self.jurisdictionFilter):
            doJur = True
            for targ in self.targets:
                if targ.has_key(srcJur):
                    doJur = False
            if doJur:
                self.targets[0][srcJur] = self.src[srcJur]
                self.keylist.append([srcJur])

    def keyInspect(self,srcJur,srcSeg,srcKey,targJur,targSeg):
        if srcJur.startswith(self.jurisdictionFilter) and srcJur == targJur and srcSeg == targSeg:
            doKey = True
            for targ in self.targets:
                if targ[srcJur][srcSeg].has_key(srcKey):
                    doKey = False
            if doKey:
                targ[srcJur][srcSeg][srcKey] = self.src[srcJur][srcSeg][srcKey]
                self.keylist.append([srcJur,srcSeg,srcKey])

    def keyAction(self,keys):
        srcJur = keys[0]
        if len(keys) > 1:
            srcSeg = keys[1]
            srcKey = keys[2]
            self.src[srcJur][srcSeg].pop(srcKey)
        else:
            self.src.pop(srcJur)

    def finish(self):
        if len(self.keylist):
            open(self.srcPath,'w+').write(json.dumps(self.srcTop,indent=2,sort_keys=True,ensure_ascii=False))
            targPath = os.path.join(abbrevsPath, self.targetsTop[0]['filename'])
            open(targPath,'w+').write(json.dumps(self.targetsTop[0],indent=2,sort_keys=True,ensure_ascii=False))
        

if __name__ == "__main__":

    from ConfigParser import ConfigParser
    from optparse import OptionParser

    os.environ['LANG'] = "en_US.UTF-8"

    usage = '\n%prog [option] <source_json> <target_group_prefix>[,<target_group_prefix>]'

    description="Inspects and filters abbreviation list content."

    parser = OptionParser(usage=usage,description=description,epilog="Happy testing!")
    parser.add_option("-c", "--find-conflicts",
                      help='Report conflicts between source and target group. Non-destructive.')
    parser.add_option("-p", "--purge-only",
                      help='Remove entries from source that are replicated in the comma-delimited target group. Aborts on conflict.')
    parser.add_option("-m", "--merge-and-purge",
                      help='Move abbrevs from source to target. Target must be a unique filename. Aborts on conflict.')
    parser.add_option("-j", "--jurisdiction-filter",
                      help='Jurisdiction scope. Required with merge-and-purge')
    parser.add_option("-n", "--normalize-files",
                      default=False,
                      action="store_true", 
                      help='Validate and normalize files for plugin build')

    (opt, args) = parser.parse_args()

    if opt.normalize_files:
        fix = Normalize()
        fix.run()
        sys.exit()

    if len(args) != 1:
        print "This script takes exactly one argument, a JSON file containing Abbreviation Filter source entries. Aborting."
        sys.exit()

    option_count = 0

    for k, v in vars(opt).items():
        if v and k != 'jurisdiction_filter':
            option_count += 1

    if opt.merge_and_purge:
        if not opt.jurisdiction_filter:
            print "Error: merge-and-purge requires jurisdiction-filter"
            sys.exit()
    else:
        if opt.jurisdiction_filter:
            print "Error: jurisdiction-filter is used only with merge-and-purge"
            sys.exit()

    if option_count == 0:
        print "An option must be set."
        sys.exit()
    elif option_count > 1:
        print "Only one option may be set (not including a jurisdiction filter)."
        sys.exit()

    if opt.find_conflicts:
        curate = FindConflicts(args[0],opt.find_conflicts)
        curate.run()

    if opt.purge_only:
        curate = FindConflicts(args[0],opt.purge_only)
        if not curate.run():
            curate = PurgeFromSource(args[0],opt.purge_only)
            curate.run()

    if opt.merge_and_purge:
        targets = opt.merge_and_purge.split(',')
        if len(targets) > 1:
            print "Target must be a single file, and the file must exist."
            sys.exit()
        if not os.path.exists(os.path.join(abbrevsPath, opt.merge_and_purge)):
            print "Target file does not exist."
            sys.exit()
        curate = FindConflicts(args[0],opt.merge_and_purge)
        if not curate.run():
            curate = MoveToTarget(args[0],opt.merge_and_purge, opt.jurisdiction_filter)
            curate.run()

