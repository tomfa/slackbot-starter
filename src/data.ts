import fetch from "node-fetch";

import { ChatBot, User } from "./types";

let userData: User[] = [];

async function isRedirected(url: string) {
  const data = await fetch(url, { method: "HEAD" });
  return data.redirected;
}

async function hasImage(user: User) {
  if (user.profile?.image_original) {
    return true;
  }
  const gravatarUrl = user.profile?.image_192;
  return !!gravatarUrl && !(await isRedirected(gravatarUrl));
}

const hasImageLazy = (user: User) => async () => {
  if (user.hasImage !== undefined) {
    return user.hasImage();
  }
  const value = await hasImage(user);
  user.hasImage = async () => value;
  return value;
};

export async function fetchUsers({
  app,
  refresh = false,
}: {
  app: ChatBot;
  refresh?: false;
}): Promise<User[]> {
  if (userData && !refresh) {
    return userData;
  }
  try {
    const result = await app.client.users.list({
      token: process.env.SLACK_BOT_TOKEN,
    });
    if (!result.members) {
      console.error(`Unable to list users`);
      return [];
    }
    userData = result.members
      .filter((m) => !m.deleted && !m.is_bot && !!m.profile && !!m.id)
      .filter((m) => m.name !== "slackbot")
      .map(
        (m): User => ({
          ...m,
          id: m.id!,
          profile: m.profile!,
          hasImage: hasImageLazy(m as User),
        })
      );

    return userData;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getUser({ app, id }: { app: ChatBot; id: string }) {
  const users = await fetchUsers({ app });
  return users.find((u) => u.id === id);
}
