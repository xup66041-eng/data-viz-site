import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Settings, Eye, PawPrint, Database } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { DynamicStatsSection } from "@/components/DynamicStatsSection";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleAnimalClick = (animalName: string) => {
    if (isAuthenticated) {
      navigate(`/dashboard?search=${encodeURIComponent(animalName)}`);
    } else {
      navigate(`/public?search=${encodeURIComponent(animalName)}`);
    }
  };

  const features = [
    {
      icon: BarChart3,
      title: "卡片式佈局",
      description: "每個數據圖表以優雅的卡片形式呈現，支援網格排列和響應式設計",
    },
    {
      icon: Settings,
      title: "自定義分類",
      description: "為卡片建立和管理多個分類標籤，方便組織和篩選數據",
    },
    {
      icon: TrendingUp,
      title: "動態數據輸入",
      description: "持續新增時間序列數據點，自動生成多種圖表類型",
    },
    {
      icon: Eye,
      title: "個人化關注頁面",
      description: "勾選想關注的數據卡片，建立您的自定義儀表板視圖",
    },
  ];

  // 統計卡片已移至 DynamicStatsSection 組件

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <PawPrint className="h-6 w-6 text-amber-600" />
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-blue-600 bg-clip-text text-transparent">
              新竹動保數據平台
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                  儀表板
                </Button>
                <Button variant="ghost" onClick={() => navigate("/categories")}>
                  分類管理
                </Button>
                <Button variant="ghost" onClick={() => navigate("/watchlist")}>
                  我的關注
                </Button>
                <Button variant="ghost" onClick={() => navigate("/tasks")}>
                  重要記事
                </Button>
                <Button variant="ghost" onClick={() => navigate("/templates")}>
                  共同範本
                </Button>
                <Button variant="outline">個人資料</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate("/public")}>
                  參觀
                </Button>
                <Button onClick={() => (window.location.href = getLoginUrl())}>
                  登入
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section with Animals */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-6xl animate-bounce" style={{ animationDelay: "0s" }}>🐕</div>
          <div className="absolute top-20 right-20 text-5xl animate-bounce" style={{ animationDelay: "0.2s" }}>🐱</div>
          <div className="absolute bottom-20 left-1/4 text-5xl animate-bounce" style={{ animationDelay: "0.4s" }}>🐄</div>
          <div className="absolute bottom-10 right-1/3 text-6xl animate-bounce" style={{ animationDelay: "0.6s" }}>🐷</div>
          <div className="absolute top-1/3 right-10 text-5xl animate-bounce" style={{ animationDelay: "0.8s" }}>🐑</div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="mb-6 inline-block">
            <div className="flex items-center justify-center gap-3 bg-gradient-to-r from-amber-100 to-blue-100 rounded-full px-6 py-3 border border-amber-200">
              <PawPrint className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-semibold text-amber-900">新竹縣動物保護教育園區</span>
            </div>
          </div>

          <h2 className="mb-4 text-5xl font-bold text-slate-900 md:text-6xl leading-tight">
            <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 bg-clip-text text-transparent">
              犬貓與家畜
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              數據追蹤平台
            </span>
          </h2>

          <p className="mb-8 text-xl text-slate-600 max-w-2xl mx-auto">
            實時追蹤動物登記、健康統計和保護數據，用大數據守護每一個生命
          </p>

          {isAuthenticated ? (
            <Button 
              size="lg" 
              onClick={() => navigate("/dashboard")} 
              className="gap-2 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white"
            >
              <Database className="h-5 w-5" />
              進入儀表板
            </Button>
          ) : (
            <div className="flex gap-4 justify-center flex-wrap">
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate("/public")} 
                className="gap-2 border-slate-300"
              >
                參觀儀表板
              </Button>
              <Button 
                size="lg" 
                onClick={() => (window.location.href = getLoginUrl())} 
                className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white"
              >
                開始使用
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Statistics Section - Dynamic */}
      <DynamicStatsSection />

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="mb-4 text-4xl font-bold text-slate-900">核心功能</h3>
            <p className="text-lg text-slate-600">為動物保護工作提供全面的數據支持</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const gradients = [
                "from-amber-50 to-orange-50 border-amber-200",
                "from-blue-50 to-cyan-50 border-blue-200",
                "from-green-50 to-emerald-50 border-green-200",
                "from-purple-50 to-pink-50 border-purple-200",
              ];

              return (
                <Card 
                  key={index} 
                  className={`bg-gradient-to-br ${gradients[index]} border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
                >
                  <CardHeader>
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-white/60 border-2 border-current">
                      <Icon className="h-7 w-7 text-slate-700" />
                    </div>
                    <CardTitle className="text-lg text-slate-900">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-slate-600">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Animal Showcase Section */}
      <section className="py-20 bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 border-y border-amber-200">
        <div className="container mx-auto px-4">
          <h3 className="mb-12 text-center text-4xl font-bold text-slate-900">
            我們追蹤的動物
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { emoji: "🐕", name: "犬隻", color: "from-amber-400 to-orange-400" },
              { emoji: "🐱", name: "貓咪", color: "from-orange-400 to-red-400" },
              { emoji: "🐄", name: "牛", color: "from-amber-300 to-yellow-400" },
              { emoji: "🐷", name: "豬", color: "from-pink-300 to-rose-400" },
              { emoji: "🐠", name: "魚", color: "from-blue-400 to-cyan-400" },
              { emoji: "🐔", name: "家禽", color: "from-yellow-400 to-orange-400" },
            ].map((animal, index) => (
              <div 
                key={index}
                onClick={() => handleAnimalClick(animal.name)}
                className={`p-6 rounded-xl bg-gradient-to-br ${animal.color} text-white text-center hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer`}
              >
                <div className="text-5xl mb-3">{animal.emoji}</div>
                <div className="font-semibold text-sm">{animal.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Insights Section */}
      <section className="py-20 bg-gradient-to-br from-blue-900 via-slate-900 to-slate-800">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="mb-6 text-4xl font-bold text-white">
                大數據守護生命
              </h3>
              <p className="mb-4 text-lg text-slate-300">
                通過實時數據追蹤和分析，我們能夠更好地了解和保護動物。
              </p>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <span>實時數據監控和統計分析</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-2xl">🎯</span>
                  <span>精準的動物健康追蹤</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-2xl">🔍</span>
                  <span>深度的數據可視化洞察</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-2xl">🌍</span>
                  <span>全面的保護工作支持</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-lg p-4 border border-amber-500/30">
                  <div className="text-3xl font-bold text-amber-300 mb-1">15,000+</div>
                  <div className="text-slate-300">動物登記記錄</div>
                </div>
                <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg p-4 border border-blue-500/30">
                  <div className="text-3xl font-bold text-blue-300 mb-1">50+</div>
                  <div className="text-slate-300">數據追蹤指標</div>
                </div>
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4 border border-green-500/30">
                  <div className="text-3xl font-bold text-green-300 mb-1">100%</div>
                  <div className="text-slate-300">數據可視化覆蓋</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500">
        <div className="container mx-auto px-4 text-center">
          <h3 className="mb-6 text-4xl font-bold text-white">
            準備好開始了嗎？
          </h3>
          <p className="mb-8 text-xl text-white/90 max-w-2xl mx-auto">
            加入我們，用數據的力量為動物保護工作做出貢獻
          </p>
          {!isAuthenticated && (
            <Button 
              size="lg" 
              onClick={() => (window.location.href = getLoginUrl())}
              className="gap-2 bg-white text-orange-600 hover:bg-slate-100 font-semibold"
            >
              <PawPrint className="h-5 w-5" />
              立即開始
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-900 py-8">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-white mb-4">關於我們</h4>
              <p className="text-slate-400 text-sm">
                致力於用大數據和可視化技術支持動物保護工作
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">快速連結</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">儀表板</a></li>
                <li><a href="#" className="hover:text-white transition">分類管理</a></li>
                <li><a href="#" className="hover:text-white transition">我的關注</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">聯繫我們</h4>
              <p className="text-slate-400 text-sm">
                新竹縣動物保護教育園區<br />
                📧 info@hsinchu-animal.org
              </p>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center text-sm text-slate-400">
            <p>© 2026 新竹動保數據平台。保留所有權利。</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
