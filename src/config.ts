import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: " 贺宏磊的个人博客",
	subtitle: "欢迎访问，贺宏磊的个人网站！",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 250, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: true,
		src: "https://img.hehonglei.cn/file/1776632752347_137882041_p0.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		 {
		   src: '/favicon/logo.png',
		   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
		 }
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		{
                        name: "博客",
                        url: "/posts/",
                        external: false,
                        icon: "material-symbols:group-outline-rounded",
                },
                {
                        name: "技术",
                        url: "/technology/",
                        external: false,
                        icon: "material-symbols:volunteer-activism-outline-rounded",
                },
                {
                        name: "阅读",
                        url: "/read/",
                        external: false,
                        icon: "material-symbols:build-outline-rounded",
                },
                {
                        name: "工具",
                        url: "/tools/",
                        external: false,
                        icon: "material-symbols:build-outline-rounded",
                },
		LinkPreset.Archive,
		LinkPreset.About,
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/avatar.gif", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "Honglei He",
	bio: "兴趣使然的网文作家，前端工程师~",
	links: [
		{
			name: "Email",
			icon: "material-symbols:mail-outline-rounded", // Visit https://icones.js.org/ for icon codes
			// You will need to install the corresponding icon set if it's not already included
			// `pnpm add @iconify-json/<icon-set-name>`
			url: "mailto:contact@hehonglei.com",
		},
		{
			name: "Discord",
			icon: "ic:baseline-discord",
			url: "https://discord.com",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/HONGLEI111",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};

export interface FriendLink {
	name: string;
	url: string;
	avatar?: string;
	description: string;
}

export const friendsConfig: { friends: FriendLink[] } = {
	friends: [
		{
			name: "阮一峰",
			url: "https://www.ruanyifeng.com",
			description: "阮一峰的网络日志",
		},
	],
};
