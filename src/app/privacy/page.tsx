export const metadata = {
  title: "개인정보처리방침",
  description: "blog.365happy365.com의 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <main className="flex-1">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-8">개인정보처리방침</h1>
        <div className="prose prose-warm max-w-none">
          <p className="text-gray-600 mb-8">
            최종 수정일: {new Date().toLocaleDateString("ko-KR")}
          </p>

          <h2>1. 개인정보의 수집 및 이용</h2>
          <p>
            blog.365happy365.com(이하 &ldquo;블로그&rdquo;)은 다음과 같은 개인정보를 수집할 수 있습니다:
          </p>
          <ul>
            <li>방문자의 IP 주소</li>
            <li>브라우저 유형 및 언어 설정</li>
            <li>접속 날짜 및 시간</li>
            <li>웹 분석 서비스를 통한 통계 정보</li>
            <li>쿠키를 통한 이용 기록</li>
          </ul>

          <h2>2. 광고 및 쿠키</h2>
          <p>
            블로그에는 Google AdSense를 통한 광고가 게재될 수 있습니다. Google은 사용자의 관심사에 기반한 맞춤형 광고를 제공하기 위해 쿠키 및 기타 추적 기술을 사용할 수 있습니다.
          </p>
          <p>
            Google의 개인정보 보호 정책 및 광고 설정은 다음 링크를 통해 확인할 수 있습니다:
          </p>
          <ul>
            <li>
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google 개인정보 보호정책
              </a>
            </li>
            <li>
              <a
                href="https://adssettings.google.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google 광고 설정
              </a>
            </li>
          </ul>

          <h2>3. 웹 분석</h2>
          <p>
            블로그는 이용 통계를 수집하기 위해 Google Analytics 또는 유사한 분석 도구를 사용할 수 있습니다. 이를 통해 수집된 정보는 블로그 개선 및 콘텐츠 최적화 목적으로만 사용됩니다.
          </p>

          <h2>3. 웹 분석</h2>
          <p>
            블로그는 이용 통계를 수집하기 위해 Google Analytics 또는 유사한 분석 도구를 사용할 수 있습니다. 이를 통해 수집된 정보는 블로그 개선 및 콘텐츠 최적화 목적으로만 사용됩니다.
          </p>

          <h2>4. 개인정보의 보유 및 이용 기간</h2>
          <p>
            개인정보는 수집 목적이 달성될 때까지 보유되며, 이후 지체 없이 파기됩니다. 단, 관련 법령의 규정에 따라 일정 기간 보관될 수 있습니다.
          </p>

          <h2>5. 개인정보의 제3자 제공</h2>
          <p>
            블로그는 사용자의 개인정보를 다음의 경우를 제외하고 제3자에게 제공하지 않습니다:
          </p>
          <ul>
            <li>사용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 따라 강제되는 경우</li>
            <li>광고 서비스(Google AdSense) 제공자</li>
          </ul>

          <h2>6. 개인정보의 안전성 확보</h2>
          <p>
            블로그는 개인정보 보호를 위해 기술적, 관리적 조치를 취하고 있습니다. 다만 인터넷 전송 과정에서의 보안을 100% 보장할 수 없습니다.
          </p>

          <h2>7. 사용자의 권리</h2>
          <p>
            사용자는 언제든지 자신의 개인정보에 대해 다음의 권리를 행사할 수 있습니다:
          </p>
          <ul>
            <li>개인정보 조회 및 수정</li>
            <li>개인정보 처리 정지 요청</li>
            <li>개인정보 삭제 요청</li>
          </ul>
          <p>
            이와 관련된 요청은 아래의 연락처를 통해 가능합니다.
          </p>

          <h2>8. 쿠키 및 추적 기술</h2>
          <p>
            블로그는 사용자 경험 개선을 위해 쿠키를 사용합니다. 사용자는 브라우저 설정을 통해 쿠키를 차단할 수 있습니다.
          </p>

          <h2>9. 정책 변경</h2>
          <p>
            이 개인정보처리방침은 법령의 변경, 서비스의 변경, 또는 기타 필요한 사유로 변경될 수 있습니다. 변경 시 블로그에 공지됩니다.
          </p>

          <h2>10. 문의</h2>
          <p>
            개인정보 보호 관련 문의사항은 아래의 연락처로 문의해주시기 바랍니다.
          </p>
          <ul>
            <li>
              <a href="mailto:contact@blog.365happy365.com">
                contact@blog.365happy365.com
              </a>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
