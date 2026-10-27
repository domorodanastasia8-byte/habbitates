import {
  getChatGPTUser,
  chatGPTSignInPath,
  isStandaloneAuthEnabled,
} from "./chatgpt-auth";
import ChallengeApp from "./challenge-app";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const user = await getChatGPTUser();
  const standalone = isStandaloneAuthEnabled();
  if (!user && process.env.NODE_ENV === "production") {
    const params = await searchParams;
    return (
      <main className="signin-shell">
        <section className="signin-card">
          <div className="brand-mark" aria-hidden="true">✦</div>
          <p className="eyebrow">Личное пространство</p>
          <h1>100 дней к себе</h1>
          {standalone ? (
            <>
              <p>Введите личный пароль, чтобы открыть дневник и синхронизировать записи между устройствами.</p>
              <form className="signin-form" action="/api/auth/login" method="post">
                <label htmlFor="password">Личный пароль</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
                {params.auth_error ? <p className="signin-error" role="alert">Пароль не подошёл. Попробуйте ещё раз.</p> : null}
                <button className="primary-button" type="submit">Войти и продолжить</button>
              </form>
              <p className="signin-note">Пароль проверяется на сервере и не сохраняется в браузере.</p>
            </>
          ) : (
            <>
              <p>Войдите через ChatGPT, чтобы ваши отметки бережно сохранялись в облаке и были доступны на ваших устройствах.</p>
              <a className="primary-button" href={chatGPTSignInPath("/")} target="_top">Войти и продолжить</a>
            </>
          )}
        </section>
      </main>
    );
  }

  return <ChallengeApp cloudEnabled={Boolean(user)} standaloneAuth={standalone} />;
}
