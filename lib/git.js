const simpleGit = require('simple-git')
const responseHandler = require('simple-git/src/git')._responseHandler

const fs = require('fs-extra')

const initGitConfig = async function(git) {
	await git.addConfig('user.email','npmbuildbot[bot]@users.noreply.github.com')
	await git.addConfig('user.name', 'npmbuildbot[bot]')
	await git.addConfig('commit.gpgsign', 'false')
    await git.addConfig('format.signoff', 'true')
}

const cloneAndCheckout = async function(context, token, branch, logger, gitRoot) {
	const git = simpleGit(gitRoot)
	git.silent(true)

	try {
		// clone
		const slug = context.repo().owner + '/' + context.repo().repo
		await git.clone(`https://x-access-token:${token}@github.com/${slug}.git`, '.')

		// setup config
		await initGitConfig(git)

		// checkout new branch
		await git.checkout(branch)
	} catch (e) {
		logger.debug(e)
		return false
	}
	return true
}

const commitAndPush = async function(path, branch, gitRoot, logger, action) {
	// init git context
	const git = simpleGit(gitRoot)
	git.silent(true)

    // setup config
    await initGitConfig(git)

	// status
	let status = false
    logger.debug(`Checking changes on ${path}`)
    
	// filter out changed files that are not in the path
	await git.raw(['status', '--porcelain', '-b', '-u', path], responseHandler(function(err, result) {
		// if error or if NEITHER of not_added and modified contains something
        if (err || !(result.not_added.length !== 0 || result.modified.length !== 0)) {
            logger.debug(`Error checking changes`, err, result)
            status = false
            return
        }
        status = true
    }, 'StatusSummary'))

	if (!status) {
		return false
	}

	// process
    let commit = false
    logger.debug(`Committing assets ${path}`)

	git.add(path)
	
	let rawArgs = ['commit', '--signoff']
	if (action === 'amend') {
		rawArgs.push('--amend')
		rawArgs.push('--no-edit')
	} else if (action === 'fixup') {
		rawArgs.push('--fixup=HEAD')
	} else {
		rawArgs.push('-m')
		rawArgs.push('Compile assets')
	}
    await git.raw(rawArgs, function(err, result) {
        if (err) {
            logger.debug(`Error committing`, err)
            return false
        }
        commit = result.commit
    })

	// pushing
	logger.debug(`Pushing to ${branch}`)
	const pushParams = {}
	if (action === 'amend') {
		pushParams['--force'] = null
	}
	await git.push('origin', branch, pushParams)

	// cleanup
	fs.remove(gitRoot)
	return commit
}

module.exports = {
	cloneAndCheckout,
	commitAndPush
}
