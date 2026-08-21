// @ts-nocheck
"use client";

import * as a from "react";
import * as s from "react/jsx-runtime";

let g = [["中文", "zh"], ["西班牙语", "es"], ["意大利语", "it"], ["法语", "fr"], ["德语", "de"], ["葡萄牙语", "pt"], ["英语", "en"]],
  v = [{
    name: "爽快思思 2.0｜中文女声",
    id: "zh_female_shuangkuaisisi_uranus_bigtts",
    lang: "zh"
  }, {
    name: "知性灿灿 2.0｜中文女声",
    id: "zh_female_cancan_uranus_bigtts",
    lang: "zh"
  }, {
    name: "云舟 2.0｜中文男声",
    id: "zh_male_m191_uranus_bigtts",
    lang: "zh"
  }, {
    name: "Dani｜西班牙男声",
    id: "es_male_dani_uranus_bigtts",
    lang: "es"
  }, {
    name: "Guillem｜西班牙男声",
    id: "es_male_guillem_uranus_bigtts",
    lang: "es"
  }, {
    name: "西班牙女声 BV084",
    id: "es_female_bv084_uranus_bigtts",
    lang: "es"
  }, {
    name: "Enzo｜意大利男声",
    id: "it_male_enzo_uranus_bigtts",
    lang: "it"
  }, {
    name: "德国女声 BV081",
    id: "de_female_bv081_uranus_bigtts",
    lang: "de"
  }, {
    name: "Usseau｜法语男声",
    id: "fr_male_usseau_uranus_bigtts",
    lang: "fr"
  }, {
    name: "法国男声 M29",
    id: "fr_male_fr_m29_uranus_bigtts",
    lang: "fr"
  }, {
    name: "法国女声 F47",
    id: "fr_female_fr_f47_uranus_bigtts",
    lang: "fr"
  }, {
    name: "法国女声 BV078",
    id: "fr_female_fr_bv078_uranus_bigtts",
    lang: "fr"
  }, {
    name: "葡萄牙男声 BV531",
    id: "pt_male_bv531_uranus_bigtts",
    lang: "pt"
  }, {
    name: "Mari｜葡萄牙女声",
    id: "pt_female_mari_uranus_bigtts",
    lang: "pt"
  }, {
    name: "Nadia｜英语女声",
    id: "en_female_nadia_tips_emo_v2_mars_bigtts",
    lang: "en"
  }, {
    name: "Sylus｜英语男声",
    id: "en_male_sylus_emo_v2_mars_bigtts",
    lang: "en"
  }],
  b = {
    zh: v[0].id,
    es: "es_female_bv084_uranus_bigtts",
    it: "it_male_enzo_uranus_bigtts",
    fr: "fr_female_fr_f47_uranus_bigtts",
    de: "de_female_bv081_uranus_bigtts",
    pt: "pt_female_mari_uranus_bigtts",
    en: "en_female_nadia_tips_emo_v2_mars_bigtts"
  },
  f = [{
    id: "natural",
    name: "自然真人",
    speed: "1",
    text: "像真人朋友面对镜头自然分享，不要播音腔，语气松弛，有轻微呼吸感"
  }, {
    id: "koc",
    name: "KOC种草",
    speed: "1.05",
    text: "像真实消费者分享刚发现的好东西，亲切可信，不过度推销"
  }, {
    id: "sales",
    name: "强节奏带货",
    speed: "1.15",
    text: "短视频带货口吻，节奏有起伏，卖点有力度，但不要机械喊叫"
  }, {
    id: "surprise",
    name: "惊讶吸睛",
    speed: "1.1",
    text: "开头带真实惊讶和好奇，随后自然解释，避免夸张表演感"
  }, {
    id: "professional",
    name: "专业讲解",
    speed: ".95",
    text: "清晰专业可信，像产品测评人讲解，重点词适当重读"
  }, {
    id: "gentle",
    name: "温柔分享",
    speed: ".9",
    text: "温柔放松、细腻亲和，像朋友轻声分享使用体验"
  }],
  k = ["惊讶吸睛", "快速悬念", "自然聊天", "清晰讲解", "卖点强调", "温柔分享", "行动感收尾"],
  N = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse"];

export default function VoiceStudio({
  initialText: e = ""
}) {
  let [l, r] = (0, a.useState)(e),
    [n, t] = (0, a.useState)("doubao"),
    [i, c] = (0, a.useState)("zh"),
    [o, d] = (0, a.useState)(b.zh),
    [h, u] = (0, a.useState)("coral"),
    [m, p] = (0, a.useState)("1"),
    [j, x] = (0, a.useState)("natural"),
    [w, C] = (0, a.useState)(f[0].text),
    [S, T] = (0, a.useState)(!0),
    [_, M] = (0, a.useState)(!0),
    [O, E] = (0, a.useState)("惊讶吸睛"),
    [A, P] = (0, a.useState)("自然聊天"),
    [D, I] = (0, a.useState)("行动感收尾"),
    [U, $] = (0, a.useState)(""),
    [L, R] = (0, a.useState)(!1),
    [q, z] = (0, a.useState)("");
  async function F() {
    if (l.trim() && !L) {
      R(!0), z("");
      try {
        let e = await fetch("gpt" === n ? "/api/openai-tts" : "/api/tts", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            text: l,
            language: i,
            speaker: "gpt" === n ? h : o,
            speed: Number(m),
            instruction: w,
            emotion: j,
            segmented: S,
            smartPause: _,
            introStyle: O,
            bodyStyle: A,
            outroStyle: D
          })
        });
        if (!e.ok) {
          let s = await e.json().catch(() => ({}));
          throw Error(s.error || "配音生成失败");
        }
        let s = await e.blob();
        U && URL.revokeObjectURL(U), $(URL.createObjectURL(s));
      } catch (e) {
        z(e instanceof Error ? e.message : "配音生成失败");
      } finally {
        R(!1);
      }
    }
  }
  return (0, a.useEffect)(() => {
    e.trim() && r(e);
  }, [e]), (0, a.useEffect)(() => () => {
    U && URL.revokeObjectURL(U);
  }, [U]), (0, s.jsxs)("section", {
    className: "voice-studio",
    children: [(0, s.jsxs)("header", {
      children: [(0, s.jsxs)("div", {
        children: [(0, s.jsx)("p", {
          className: "eyebrow",
          children: "AI VOICE STUDIO"
        }), (0, s.jsx)("h1", {
          children: "AI 真人配音"
        }), (0, s.jsx)("p", {
          children: "豆包与GPT双引擎，多国语言、真人情绪、智能停顿与分段演绎。"
        })]
      }), (0, s.jsxs)("div", {
        className: "status",
        children: [(0, s.jsx)("i", {}), " ", "gpt" === n ? "GPT配音" : "豆包语音 2.0"]
      })]
    }), (0, s.jsxs)("div", {
      className: "voice-layout",
      children: [(0, s.jsxs)("section", {
        className: "voice-editor",
        children: [(0, s.jsx)("span", {
          className: "modal-kicker",
          children: "VOICEOVER COPY"
        }), (0, s.jsx)("h2", {
          children: "配音文案"
        }), (0, s.jsx)("textarea", {
          value: l,
          onChange: e => r(e.target.value),
          rows: 18,
          placeholder: "粘贴完整口播……"
        }), (0, s.jsxs)("small", {
          children: [l.length, "/5000 字"]
        })]
      }), (0, s.jsxs)("section", {
        className: "voice-controls",
        children: [(0, s.jsx)("span", {
          className: "modal-kicker",
          children: "VOICE SETTINGS"
        }), (0, s.jsx)("h2", {
          children: "声音设置"
        }), (0, s.jsxs)("div", {
          className: "provider-tabs",
          children: [(0, s.jsx)("button", {
            className: "doubao" === n ? "selected" : "",
            onClick: () => {
              t("doubao"), z("");
            },
            children: "豆包语音 2.0"
          }), (0, s.jsxs)("button", {
            className: "gpt" === n ? "selected" : "",
            onClick: () => {
              t("gpt"), z("");
            },
            children: ["GPT 真人配音 ", (0, s.jsx)("em", {
              children: "待配置"
            })]
          })]
        }), (0, s.jsxs)("div", {
          className: "voice-two",
          children: [(0, s.jsxs)("label", {
            children: ["语言", (0, s.jsx)("select", {
              value: i,
              onChange: e => {
                c(e.target.value), d(b[e.target.value]);
              },
              children: g.map(([e, a]) => (0, s.jsx)("option", {
                value: a,
                children: e
              }, a))
            })]
          }), "doubao" === n ? (0, s.jsxs)("label", {
            children: ["豆包音色", (0, s.jsx)("select", {
              value: o,
              onChange: e => d(e.target.value),
              children: v.filter(e => e.lang === i).map(e => (0, s.jsx)("option", {
                value: e.id,
                children: e.name
              }, e.id))
            })]
          }) : (0, s.jsxs)("label", {
            children: ["GPT音色", (0, s.jsx)("select", {
              value: h,
              onChange: e => u(e.target.value),
              children: N.map(e => (0, s.jsx)("option", {
                value: e,
                children: e[0].toUpperCase() + e.slice(1)
              }, e))
            })]
          })]
        }), "gpt" === n && (0, s.jsxs)("aside", {
          children: [(0, s.jsx)("b", {
            children: "GPT接口已预留"
          }), (0, s.jsx)("p", {
            children: "充值OpenAI API并添加 OPENAI_API_KEY 后即可使用，无需再次修改网站。"
          })]
        }), (0, s.jsxs)("label", {
          children: ["情绪预设", (0, s.jsx)("select", {
            value: j,
            onChange: e => {
              let s = f.find(s => s.id === e.target.value);
              x(s.id), p(s.speed), C(s.text);
            },
            children: f.map(e => (0, s.jsx)("option", {
              value: e.id,
              children: e.name
            }, e.id))
          })]
        }), (0, s.jsxs)("div", {
          className: "voice-switches",
          children: [(0, s.jsxs)("button", {
            className: S ? "on" : "",
            onClick: () => T(!S),
            children: [(0, s.jsx)("i", {}), " 分段情绪控制"]
          }), (0, s.jsxs)("button", {
            className: _ ? "on" : "",
            onClick: () => M(!_),
            children: [(0, s.jsx)("i", {}), " 智能停顿与换气"]
          })]
        }), S && (0, s.jsxs)("div", {
          className: "segment-grid",
          children: [(0, s.jsxs)("label", {
            children: ["前3秒", (0, s.jsx)("select", {
              value: O,
              onChange: e => E(e.target.value),
              children: k.map(e => (0, s.jsx)("option", {
                children: e
              }, e))
            })]
          }), (0, s.jsxs)("label", {
            children: ["正文", (0, s.jsx)("select", {
              value: A,
              onChange: e => P(e.target.value),
              children: k.map(e => (0, s.jsx)("option", {
                children: e
              }, e))
            })]
          }), (0, s.jsxs)("label", {
            children: ["结尾", (0, s.jsx)("select", {
              value: D,
              onChange: e => I(e.target.value),
              children: k.map(e => (0, s.jsx)("option", {
                children: e
              }, e))
            })]
          })]
        }), (0, s.jsxs)("label", {
          children: ["语速", (0, s.jsx)("select", {
            value: m,
            onChange: e => p(e.target.value),
            children: ["0.8", "0.9", "1", "1.05", "1.1", "1.15", "1.2"].map(e => (0, s.jsxs)("option", {
              value: e,
              children: [e, "×"]
            }, e))
          })]
        }), (0, s.jsxs)("label", {
          children: ["语气指令", (0, s.jsx)("textarea", {
            rows: 3,
            value: w,
            onChange: e => C(e.target.value)
          })]
        }), q && (0, s.jsx)("p", {
          className: "voice-error",
          children: q
        }), (0, s.jsx)("button", {
          className: "voice-generate",
          disabled: !l.trim() || l.length > 5e3 || L,
          onClick: F,
          children: L ? `正在生成${"gpt" === n ? "GPT" : "豆包"}配音…` : `♫ 生成${"gpt" === n ? "GPT" : "豆包"}配音`
        }), U && (0, s.jsxs)("div", {
          className: "voice-player",
          children: [(0, s.jsx)("audio", {
            controls: !0,
            src: U
          }), (0, s.jsx)("button", {
            onClick: function () {
              if (!U) return;
              let e = document.createElement("a");
              e.href = U, e.download = `苏苏${"gpt" === n ? "GPT" : "豆包"}配音-${Date.now()}.mp3`, e.click();
            },
            children: "⇩ 下载 MP3"
          })]
        })]
      })]
    })]
  });
}
