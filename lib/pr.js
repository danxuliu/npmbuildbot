module.exports = {
	isMerged: async function(context, id) {
		const pr = await this.getPR(context)
		return pr.data.merged === true
	},
  
  isClosed: async function(context) {
		const pr = await this.getPR(context)
		return pr.data.state === 'closed'
	},

	getBranch: async function(context) {
		const pr = await this.getPR(context)
		return pr.data.head.ref
	},

	getPR: async function(context) {
		const params = context.repo({ pull_number: context.payload.issue.number })
		return context.github.pullRequests.get(params)
	}
}
