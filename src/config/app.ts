type AppConfigType = {
    name: string,
    github: {
        title: string,
        url: string
    },
    author: {
        name: string,
        url: string
    },
}

export const appConfig: AppConfigType = {
    name: import.meta.env.VITE_APP_NAME ?? "Mowny",
    github: {
        title: "Mowny",
        url: "",
    },
    author: {
        name: "Gebw",
        url: "https://github.com/Berykwn/",
    }
}

export const baseUrl = import.meta.env.VITE_BASE_URL ?? ""
