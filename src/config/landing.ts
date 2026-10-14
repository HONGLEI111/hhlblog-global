export const SITE = {
	name: "HHLBlog",
	site: "https://www.hehonglei.com",
	base: "/",
	trailingSlash: true,
};

export const APP_BLOG = {
	isEnabled: true,
	postsPerPage: 8,
	post: {
		permalink: "/%slug%",
	},
	list: {
		pathname: "posts",
	},
	category: {
		pathname: "category",
	},
	tag: {
		pathname: "tag",
	},
};

export const UI = {
	theme: "system",
};
