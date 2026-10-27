import { getChatGPTUser, chatGPTSignInPath } from "./chatgpt-auth";
import ChallengeApp from "./challenge-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  if (!user && process.env.NODE_ENV === "production") {
    return (
      <main className="signin-shell">
        <section className="signin-card">
          <div className="brand-mark" aria-hidden="true">✦</div>
          <p className="eyebrow">Личное пространство</p>
          <h1>100 дней к себе</h1>
          <p>Войдите через ChatGPT, чтобы ваши отметки бережно сохранялись в облаке и были доступны на ваших устройствах.</p>
          <a className="primary-button" href={chatGPTSignInPath("/")} target="_top">Войти и продолжить</a>
        </section>
      </main>
    );
  }

  return <ChallengeApp cloudEnabled={Boolean(user)} />;
}
