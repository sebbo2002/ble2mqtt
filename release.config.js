const plugins = [
    ['@semantic-release/commit-analyzer', {
        'preset': 'angular',
        'releaseRules': [
            {'type': 'docs', 'scope': 'README', 'release': 'patch'},
            {'type': 'refactor', 'release': 'patch'},
            {'type': 'build', 'scope': 'deps', 'release': 'patch'}
        ],
        'parserOpts': {
            'noteKeywords': ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING']
        }
    }],
    ['@semantic-release/release-notes-generator', {
        'preset': 'angular',
        'parserOpts': {
            'noteKeywords': ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING']
        },
        'writerOpts': {
            'commitsSort': ['subject', 'scope']
        }
    }],
    '@semantic-release/changelog',
    ['@semantic-release/exec', {
        'prepareCmd': 'VERSION=${nextRelease.version} ./.github/workflows/release-prepare.sh',
        'success': 'VERSION=${nextRelease.version} ./.github/workflows/release-success.sh'
    }],
    '@semantic-release/npm',
    '@semantic-release/github'
];

if (process.env.BRANCH === 'main') {
    plugins.push(['@semantic-release/git', {
        'assets': ['CHANGELOG.md', 'package.json', 'package-lock.json'],
        'message': 'chore(release): :bookmark: ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
    }]);
}

module.exports = {
    'branches': [
        'main',
        {
            'name': 'develop',
            'channel': 'next',
            'prerelease': true
        }
    ],
    plugins
};
