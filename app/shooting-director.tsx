// @ts-nocheck
"use client";

import * as a from "react";
import * as s from "react/jsx-runtime";

let p = ["桌拍实测", "模特口播", "第一人称开箱", "门店场景", "双人对话"],
  j = ["破坏测试", "失败救援", "视觉悬念", "结果前置", "评论质疑"];

export default function ShootingDirector({
  initialScript: e = ""
}) {
  let [l, r] = (0, a.useState)(e),
    [n, t] = (0, a.useState)("CrystalArmor 钢化膜"),
    [i, c] = (0, a.useState)("45"),
    [o, d] = (0, a.useState)(p[0]),
    [h, u] = (0, a.useState)(j[0]),
    [m, g] = (0, a.useState)("白色桌面＋深色背景"),
    [v, b] = (0, a.useState)("单人手模"),
    [f, k] = (0, a.useState)(!1),
    [N, y] = (0, a.useState)(!1),
    [w, C] = (0, a.useState)(0),
    [S, T] = (0, a.useState)(42),
    _ = (0, a.useMemo)(() => {
      let e = l.replace(/\r/g, "").split(/(?<=[。！？!?；;])|\n+/).map(e => e.trim()).filter(Boolean),
        s = Math.max(15, Number(i) || 45),
        a = e.length ? e : ["先看这个测试结果。", "普通产品的问题马上就出现了。", "现在换成我们的产品。", "清洁并对准产品。", "完成核心安装动作。", "近距离检查最终效果。", "连续展示核心卖点。", "回到开头完成同条件复测。", "展示包装和购买入口。"],
        r = Math.min(12, Math.max(7, a.length)),
        n = [`${h}首帧，结果或测试工具先入镜`, "旧方法失败细节特写", "产品从画面侧面快速入镜", "俯拍完整准备动作", "45°近景展示核心操作", "微距检查边角、灰尘与气泡", "连续动作验证主要卖点", "回到开头场景完成闭环", "产品包装、优惠与CTA定格"];
      return Array.from({
        length: r
      }, (e, l) => {
        let t = Math.round(l * s / r),
          i = Math.round((l + 1) * s / r),
          c = 0 === l,
          d = l === r - 1;
        return {
          time: `${t}–${i}s`,
          shot: c ? "极近景" : d ? "中近景" : "近景",
          camera: "第一人称开箱" === o ? "胸前第一视角" : l % 3 == 0 ? "正俯拍" : l % 3 == 1 ? "45°侧拍" : "微距特写",
          action: n[Math.min(l, n.length - 1)] || "补充结果与使用场景",
          line: a[Math.min(l, a.length - 1)] || a[a.length - 1],
          edit: c ? "首帧大字＋撞击/悬念音效" : d ? "CTA字幕停留2秒" : "按动作点快切，保留真实操作声",
          props: c ? "测试工具、旧款产品、手机" : l < 3 ? "普通款、失败样品" : d ? "包装、赠品、价格牌" : "手机、产品、清洁工具"
        };
      });
    }, [l, i, o, h]),
    M = (0, a.useMemo)(() => Array.from(new Set(_.flatMap(e => e.props.split("、")))), [_]),
    O = (0, a.useMemo)(() => {
      let e = _.map(e => e.action + e.line).join("");
      return [!/特写|微距/.test(e) && "缺少产品细节特写", !/结果|最终|检查/.test(e) && "缺少结果证明镜头", !/包装|CTA|购买/.test(e) && "缺少结尾转化镜头", !/失败|普通|旧方法/.test(e) && "缺少问题或对比镜头"].filter(Boolean);
    }, [_]);
  return (0, s.jsxs)("section", {
    className: "director-studio",
    children: [(0, s.jsxs)("header", {
      children: [(0, s.jsxs)("div", {
        children: [(0, s.jsx)("p", {
          className: "eyebrow",
          children: "AI SHOOTING DIRECTOR"
        }), (0, s.jsx)("h1", {
          children: "AI 拍摄导演"
        }), (0, s.jsx)("p", {
          children: "从口播到可执行分镜、道具清单、镜头缺口和模特提词，一次完成。"
        })]
      }), (0, s.jsxs)("div", {
        className: "status",
        children: [(0, s.jsx)("i", {}), " DIRECTOR MODE"]
      })]
    }), (0, s.jsxs)("div", {
      className: "director-layout",
      children: [(0, s.jsxs)("section", {
        className: "director-form",
        children: [(0, s.jsx)("span", {
          className: "modal-kicker",
          children: "SHOOTING BRIEF"
        }), (0, s.jsx)("h2", {
          children: "拍摄任务"
        }), (0, s.jsxs)("label", {
          children: ["产品名称", (0, s.jsx)("input", {
            value: n,
            onChange: e => t(e.target.value)
          })]
        }), (0, s.jsxs)("label", {
          children: ["完整口播", (0, s.jsx)("textarea", {
            rows: 10,
            value: l,
            onChange: e => r(e.target.value),
            placeholder: "粘贴脚本口播；不填也可以先生成通用拍摄方案"
          })]
        }), (0, s.jsxs)("div", {
          className: "director-two",
          children: [(0, s.jsxs)("label", {
            children: ["视频形式", (0, s.jsx)("select", {
              value: o,
              onChange: e => d(e.target.value),
              children: p.map(e => (0, s.jsx)("option", {
                children: e
              }, e))
            })]
          }), (0, s.jsxs)("label", {
            children: ["开头机制", (0, s.jsx)("select", {
              value: h,
              onChange: e => u(e.target.value),
              children: j.map(e => (0, s.jsx)("option", {
                children: e
              }, e))
            })]
          })]
        }), (0, s.jsxs)("div", {
          className: "director-two",
          children: [(0, s.jsxs)("label", {
            children: ["时长", (0, s.jsxs)("select", {
              value: i,
              onChange: e => c(e.target.value),
              children: [(0, s.jsx)("option", {
                children: "15"
              }), (0, s.jsx)("option", {
                children: "30"
              }), (0, s.jsx)("option", {
                children: "45"
              }), (0, s.jsx)("option", {
                children: "60"
              })]
            })]
          }), (0, s.jsxs)("label", {
            children: ["模特配置", (0, s.jsx)("input", {
              value: v,
              onChange: e => b(e.target.value)
            })]
          })]
        }), (0, s.jsxs)("label", {
          children: ["场景", (0, s.jsx)("input", {
            value: m,
            onChange: e => g(e.target.value)
          })]
        }), (0, s.jsx)("button", {
          className: "director-generate",
          onClick: () => k(!0),
          children: "✦ 生成拍摄执行方案"
        })]
      }), (0, s.jsx)("section", {
        className: "director-output",
        children: f ? (0, s.jsxs)(s.Fragment, {
          children: [(0, s.jsxs)("div", {
            className: "director-actions",
            children: [(0, s.jsxs)("div", {
              children: [(0, s.jsx)("span", {
                children: o
              }), (0, s.jsxs)("b", {
                children: [_.length, "个镜头 · ", i, "秒"]
              })]
            }), (0, s.jsx)("button", {
              onClick: () => {
                C(0), y(!0);
              },
              children: "打开提词器"
            }), (0, s.jsx)("button", {
              onClick: function () {
                let e = "\ufeff" + [["时间", "景别", "机位", "动作画面", "口播字幕", "剪辑提示", "道具"], ..._.map(e => [e.time, e.shot, e.camera, e.action, e.line, e.edit, e.props])].map(e => e.map(e => `"${e.replaceAll('"', '""')}"`).join(",")).join("\n"),
                  s = document.createElement("a");
                s.href = URL.createObjectURL(new Blob([e], {
                  type: "text/csv"
                })), s.download = `${n}-拍摄分镜.csv`, s.click(), URL.revokeObjectURL(s.href);
              },
              children: "导出分镜"
            })]
          }), (0, s.jsxs)("div", {
            className: "director-summary",
            children: [(0, s.jsxs)("article", {
              children: [(0, s.jsx)("span", {
                children: "拍摄场景"
              }), (0, s.jsx)("b", {
                children: m
              })]
            }), (0, s.jsxs)("article", {
              children: [(0, s.jsx)("span", {
                children: "模特"
              }), (0, s.jsx)("b", {
                children: v
              })]
            }), (0, s.jsxs)("article", {
              children: [(0, s.jsx)("span", {
                children: "拍摄时长"
              }), (0, s.jsxs)("b", {
                children: ["约", Math.max(30, 5 * _.length), "分钟"]
              })]
            })]
          }), (0, s.jsxs)("div", {
            className: "director-shots",
            children: [(0, s.jsxs)("div", {
              className: "director-shot-head",
              children: [(0, s.jsx)("span", {
                children: "时间/机位"
              }), (0, s.jsx)("span", {
                children: "画面动作"
              }), (0, s.jsx)("span", {
                children: "口播字幕"
              }), (0, s.jsx)("span", {
                children: "剪辑/道具"
              })]
            }), _.map((e, a) => (0, s.jsxs)("article", {
              children: [(0, s.jsxs)("div", {
                children: [(0, s.jsx)("b", {
                  children: e.time
                }), (0, s.jsxs)("span", {
                  children: [e.shot, " · ", e.camera]
                })]
              }), (0, s.jsx)("p", {
                children: e.action
              }), (0, s.jsx)("blockquote", {
                children: e.line
              }), (0, s.jsxs)("small", {
                children: [e.edit, (0, s.jsx)("br", {}), "道具：", e.props]
              })]
            }, a))]
          }), (0, s.jsxs)("div", {
            className: "director-bottom",
            children: [(0, s.jsxs)("section", {
              children: [(0, s.jsx)("h3", {
                children: "拍摄清单"
              }), M.map(e => (0, s.jsxs)("label", {
                children: [(0, s.jsx)("input", {
                  type: "checkbox"
                }), " ", e]
              }, e))]
            }), (0, s.jsxs)("section", {
              children: [(0, s.jsx)("h3", {
                children: "镜头缺口检查"
              }), O.length ? O.map(e => (0, s.jsxs)("p", {
                children: ["! ", e]
              }, e)) : (0, s.jsx)("p", {
                className: "director-ok",
                children: "✓ 对比、过程、结果和CTA镜头齐全"
              }), (0, s.jsx)("p", {
                children: "建议额外拍：空镜、手部过渡、包装旋转、结果微距，各5秒。"
              })]
            }), (0, s.jsxs)("section", {
              children: [(0, s.jsx)("h3", {
                children: "多机位备选"
              }), (0, s.jsx)("p", {
                children: "桌拍：正俯拍＋45°侧拍＋微距"
              }), (0, s.jsx)("p", {
                children: "模特：正面中景＋肩后视角＋产品特写"
              }), (0, s.jsx)("p", {
                children: "门店：货架广角＋柜台操作＋顾客视角"
              })]
            })]
          })]
        }) : (0, s.jsxs)("div", {
          className: "director-empty",
          children: [(0, s.jsx)("span", {
            children: "🎬"
          }), (0, s.jsx)("h2", {
            children: "等待生成拍摄方案"
          }), (0, s.jsx)("p", {
            children: "将输出逐秒分镜、机位动作、道具清单、缺口检查和提词器。"
          })]
        })
      })]
    }), N && (0, s.jsxs)("div", {
      className: "prompt-screen",
      children: [(0, s.jsx)("button", {
        onClick: () => y(!1),
        children: "× 退出"
      }), (0, s.jsxs)("div", {
        className: "prompt-tools",
        children: [(0, s.jsx)("button", {
          onClick: () => T(Math.max(28, S - 4)),
          children: "A−"
        }), (0, s.jsxs)("span", {
          children: [w + 1, "/", _.length]
        }), (0, s.jsx)("button", {
          onClick: () => T(Math.min(72, S + 4)),
          children: "A＋"
        })]
      }), (0, s.jsx)("p", {
        style: {
          fontSize: S
        },
        children: _[w]?.line
      }), (0, s.jsxs)("footer", {
        children: [(0, s.jsx)("button", {
          disabled: 0 === w,
          onClick: () => C(e => e - 1),
          children: "← 上一句"
        }), (0, s.jsx)("button", {
          disabled: w === _.length - 1,
          onClick: () => C(e => e + 1),
          children: "下一句 →"
        })]
      })]
    })]
  });
}
