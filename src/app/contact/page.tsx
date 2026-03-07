export const metadata = {
  title: "연락처",
  description: "blog.365happy365.com에 문의하기",
};

export default function ContactPage() {
  return (
    <main className="flex-1">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-8">연락처</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">문의하기</h2>
            <p className="text-gray-700 mb-6">
              블로그 콘텐츠에 대한 질문, 제안, 혹은 기타 문의사항이 있으신가요?
              아래 이메일로 언제든지 연락주시기 바랍니다.
            </p>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <p className="text-gray-600 mb-2">이메일:</p>
              <a
                href="mailto:contact@blog.365happy365.com"
                className="text-amber-600 hover:text-amber-700 font-medium text-lg break-all"
              >
                contact@blog.365happy365.com
              </a>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">응답 시간</h2>
            <p className="text-gray-700">
              문의사항에 대해서는 가능한 한 빠르게 답변을 드리려고 노력하고 있습니다.
              일반적으로 2~3일 이내에 회신하고 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">문의 예시</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-amber-600 mr-3">•</span>
                <span>콘텐츠 오류 또는 개선 제안</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-600 mr-3">•</span>
                <span>협력 및 파트너십 제안</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-600 mr-3">•</span>
                <span>저작권 및 지적재산권 관련 문의</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-600 mr-3">•</span>
                <span>기타 블로그 관련 문의</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">개인정보</h2>
            <p className="text-gray-700 mb-4">
              이메일을 통해 제공된 개인정보는 문의 응답 목적으로만 사용되며,
              관련 법령에 따라 보호됩니다.
            </p>
            <a
              href="/privacy"
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              개인정보처리방침 보기 →
            </a>
          </section>
        </div>
      </div>
    </main>
  );
}
