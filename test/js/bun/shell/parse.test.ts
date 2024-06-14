import { createTestBuilder, redirect } from "./util";
import { shellInternals } from "bun:internal-for-testing";
const { parse } = shellInternals;
const TestBuilder = createTestBuilder(import.meta.path);

describe("parse shell", () => {
  test("basic", () => {
    const expected = {
      stmts: [
        {
          exprs: [
            {
              cmd: {
                assigns: [],
                name_and_args: [
                  {
                    simple: {
                      Text: "echo",
                    },
                  },
                  {
                    simple: {
                      Text: "foo",
                    },
                  },
                ],
                redirect: redirect({}),
                redirect_file: null,
              },
            },
          ],
        },
      ],
    };

    const result = parse`echo foo`;
    expect(JSON.parse(result)).toEqual(expected);
  });

  test("basic redirect", () => {
    const expected = {
      stmts: [
        {
          exprs: [
            {
              cmd: {
                assigns: [],
                name_and_args: [{ simple: { Text: "echo" } }, { simple: { Text: "foo" } }],
                redirect: redirect({ stdout: true }),
                redirect_file: { atom: { simple: { Text: "lmao.txt" } } },
              },
            },
          ],
        },
      ],
    };

    const result = JSON.parse(parse`echo foo > lmao.txt`);
    expect(result).toEqual(expected);
  });

  test("compound atom", () => {
    const expected = {
      stmts: [
        {
          exprs: [
            {
              cmd: {
                assigns: [],
                name_and_args: [
                  {
                    compound: {
                      atoms: [{ Text: "FOO " }, { Var: "NICE" }, { Text: "!" }],
                      brace_expansion_hint: false,
                      glob_hint: false,
                    },
                  },
                ],
                redirect: redirect({}),
                redirect_file: null,
              },
            },
          ],
        },
      ],
    };

    const result = JSON.parse(parse`"FOO $NICE!"`);
    console.log("Result", JSON.stringify(result));
    expect(result).toEqual(expected);
  });

  test("pipelines", () => {
    const expected = {
      stmts: [
        {
          exprs: [
            {
              pipeline: {
                items: [
                  {
                    cmd: {
                      assigns: [],
                      name_and_args: [{ simple: { Text: "echo" } }],
                      redirect: redirect({ stdout: true }),
                      redirect_file: { atom: { simple: { Text: "foo.txt" } } },
                    },
                  },
                  {
                    cmd: {
                      assigns: [],
                      name_and_args: [{ simple: { Text: "echo" } }, { simple: { Text: "hi" } }],
                      redirect: redirect({}),
                      redirect_file: null,
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const result = JSON.parse(parse`echo > foo.txt | echo hi`);
    // console.log(result);
    expect(result).toEqual(expected);
  });

  test("binary expressions", () => {
    const expected = {
      stmts: [
        {
          exprs: [
            {
              binary: {
                op: "Or",
                left: {
                  binary: {
                    op: "And",
                    left: {
                      cmd: {
                        assigns: [],
                        name_and_args: [{ simple: { Text: "echo" } }, { simple: { Text: "foo" } }],
                        redirect: redirect(),
                        redirect_file: null,
                      },
                    },
                    right: {
                      cmd: {
                        assigns: [],
                        name_and_args: [{ simple: { Text: "echo" } }, { simple: { Text: "bar" } }],
                        redirect: redirect(),
                        redirect_file: null,
                      },
                    },
                  },
                },
                right: {
                  cmd: {
                    assigns: [],
                    name_and_args: [{ simple: { Text: "echo" } }, { simple: { Text: "lmao" } }],
                    redirect: redirect(),
                    redirect_file: null,
                  },
                },
              },
            },
          ],
        },
      ],
    };
    const result = JSON.parse(parse`echo foo && echo bar || echo lmao`);
    // console.log(result);
    expect(result).toEqual(expected);
  });

  test("precedence", () => {
    const expected = {
      stmts: [
        {
          exprs: [
            {
              binary: {
                op: "And",
                left: {
                  binary: {
                    op: "And",
                    left: {
                      assign: [{ label: "FOO", value: { simple: { Text: "bar" } } }],
                    },
                    right: {
                      cmd: {
                        assigns: [],
                        name_and_args: [{ simple: { Text: "echo" } }, { simple: { Text: "foo" } }],
                        redirect: redirect(),
                        redirect_file: null,
                      },
                    },
                  },
                },
                right: {
                  pipeline: {
                    items: [
                      {
                        cmd: {
                          assigns: [],
                          name_and_args: [{ simple: { Text: "echo" } }, { simple: { Text: "bar" } }],
                          redirect: redirect(),
                          redirect_file: null,
                        },
                      },
                      {
                        cmd: {
                          assigns: [],
                          name_and_args: [{ simple: { Text: "echo" } }, { simple: { Text: "lmao" } }],
                          redirect: redirect(),
                          redirect_file: null,
                        },
                      },
                      {
                        cmd: {
                          assigns: [],
                          name_and_args: [{ simple: { Text: "cat" } }],
                          redirect: redirect({ stdout: true }),
                          redirect_file: {
                            atom: { simple: { Text: "foo.txt" } },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      ],
    };

    const result = parse`FOO=bar && echo foo && echo bar | echo lmao | cat > foo.txt`;
    // console.log(result);
    expect(JSON.parse(result)).toEqual(expected);
  });

  test("assigns", () => {
    const expected = {
      stmts: [
        {
          exprs: [
            {
              cmd: {
                assigns: [
                  { label: "FOO", value: { simple: { Text: "bar" } } },
                  { label: "BAR", value: { simple: { Text: "baz" } } },
                ],
                name_and_args: [{ simple: { Text: "export" } }, { simple: { Text: "LMAO=nice" } }],
                redirect: {
                  stdin: false,
                  stdout: false,
                  stderr: false,
                  append: false,
                  duplicate_out: false,
                  __unused: 0,
                },
                redirect_file: null,
              },
            },
          ],
        },
      ],
    };

    const result = JSON.parse(parse`FOO=bar BAR=baz export LMAO=nice`);
    console.log("Result", JSON.stringify(result));
    expect(result).toEqual(expected);
  });

  test("redirect js obj", () => {
    const expected = {
      stmts: [
        {
          exprs: [
            {
              binary: {
                op: "And",
                left: {
                  cmd: {
                    assigns: [],
                    name_and_args: [{ simple: { Text: "echo" } }, { simple: { Text: "foo" } }],
                    redirect: redirect({ stdout: true }),
                    redirect_file: { jsbuf: { idx: 0 } },
                  },
                },
                right: {
                  cmd: {
                    assigns: [],
                    name_and_args: [{ simple: { Text: "echo" } }, { simple: { Text: "foo" } }],
                    redirect: redirect({ stdout: true }),
                    redirect_file: { jsbuf: { idx: 1 } },
                  },
                },
              },
            },
          ],
        },
      ],
    };

    const buffer = new Uint8Array(1 << 20);
    const buffer2 = new Uint8Array(1 << 20);
    const result = JSON.parse(parse`echo foo > ${buffer} && echo foo > ${buffer2}`);

    // console.log("Result", JSON.stringify(result));
    expect(result).toEqual(expected);
  });

  test("cmd subst", () => {
    const expected = {
      stmts: [
        {
          exprs: [
            {
              cmd: {
                assigns: [],
                name_and_args: [
                  { simple: { Text: "echo" } },
                  {
                    simple: {
                      cmd_subst: {
                        script: {
                          stmts: [
                            {
                              exprs: [
                                {
                                  cmd: {
                                    assigns: [],
                                    name_and_args: [{ simple: { Text: "echo" } }, { simple: { Text: "1" } }],
                                    redirect: {
                                      stdin: false,
                                      stdout: false,
                                      stderr: false,
                                      append: false,
                                      duplicate_out: false,
                                      __unused: 0,
                                    },
                                    redirect_file: null,
                                  },
                                },
                              ],
                            },
                            {
                              exprs: [
                                {
                                  cmd: {
                                    assigns: [],
                                    name_and_args: [{ simple: { Text: "echo" } }, { simple: { Text: "2" } }],
                                    redirect: {
                                      stdin: false,
                                      stdout: false,
                                      stderr: false,
                                      append: false,
                                      duplicate_out: false,
                                      __unused: 0,
                                    },
                                    redirect_file: null,
                                  },
                                },
                              ],
                            },
                          ],
                        },
                        quoted: true,
                      },
                    },
                  },
                ],
                redirect: {
                  stdin: false,
                  stdout: false,
                  stderr: false,
                  append: false,
                  duplicate_out: false,
                  __unused: 0,
                },
                redirect_file: null,
              },
            },
          ],
        },
      ],
    };

    const result = JSON.parse(parse`echo "$(echo 1; echo 2)"`);
    expect(result).toEqual(expected);
  });

  test("cmd subst edgecase", () => {
    const expected = {
      stmts: [
        {
          exprs: [
            {
              binary: {
                op: "And",
                left: {
                  cmd: {
                    assigns: [],
                    name_and_args: [
                      { simple: { Text: "echo" } },
                      {
                        simple: {
                          cmd_subst: {
                            script: {
                              stmts: [
                                {
                                  exprs: [
                                    {
                                      cmd: {
                                        assigns: [],
                                        name_and_args: [{ simple: { Text: "ls" } }, { simple: { Text: "foo" } }],
                                        redirect: {
                                          stdin: false,
                                          stdout: false,
                                          stderr: false,
                                          append: false,
                                          duplicate_out: false,
                                          __unused: 0,
                                        },
                                        redirect_file: null,
                                      },
                                    },
                                  ],
                                },
                              ],
                            },
                            quoted: false,
                          },
                        },
                      },
                    ],
                    redirect: {
                      stdin: false,
                      stdout: false,
                      stderr: false,
                      append: false,
                      duplicate_out: false,
                      __unused: 0,
                    },
                    redirect_file: null,
                  },
                },
                right: {
                  cmd: {
                    assigns: [],
                    name_and_args: [{ simple: { Text: "echo" } }, { simple: { Text: "nice" } }],
                    redirect: {
                      stdin: false,
                      stdout: false,
                      stderr: false,
                      append: false,
                      duplicate_out: false,
                      __unused: 0,
                    },
                    redirect_file: null,
                  },
                },
              },
            },
          ],
        },
      ],
    };
    const result = JSON.parse(parse`echo $(ls foo) && echo nice`);
    expect(result).toEqual(expected);
  });

  describe("if_clause", () => {
    test("basic", () => {
      const expected = {
        "stmts": [
          {
            "exprs": [
              {
                "if": {
                  "cond": [
                    {
                      "exprs": [
                        {
                          "cmd": {
                            "assigns": [],
                            "name_and_args": [{ "simple": { "Text": "echo" } }, { "simple": { "Text": "hi" } }],
                            "redirect": {
                              "stdin": false,
                              "stdout": false,
                              "stderr": false,
                              "append": false,
                              "duplicate_out": false,
                              "__unused": 0,
                            },
                            "redirect_file": null,
                          },
                        },
                      ],
                    },
                  ],
                  "then": [
                    {
                      "exprs": [
                        {
                          "cmd": {
                            "assigns": [],
                            "name_and_args": [{ "simple": { "Text": "echo" } }, { "simple": { "Text": "lmao" } }],
                            "redirect": {
                              "stdin": false,
                              "stdout": false,
                              "stderr": false,
                              "append": false,
                              "duplicate_out": false,
                              "__unused": 0,
                            },
                            "redirect_file": null,
                          },
                        },
                      ],
                    },
                  ],
                  "else_parts": [
                    [
                      {
                        "exprs": [
                          {
                            "cmd": {
                              "assigns": [],
                              "name_and_args": [{ "simple": { "Text": "echo" } }, { "simple": { "Text": "lol" } }],
                              "redirect": {
                                "stdin": false,
                                "stdout": false,
                                "stderr": false,
                                "append": false,
                                "duplicate_out": false,
                                "__unused": 0,
                              },
                              "redirect_file": null,
                            },
                          },
                        ],
                      },
                    ],
                  ],
                },
              },
            ],
          },
        ],
      };

      let result = JSON.parse(parse`if echo hi; then echo lmao; else echo lol; fi`);
      expect(result).toEqual(expected);
      result = JSON.parse(parse`if echo hi
      then echo lmao
      else echo lol
      fi`);
      expect(result).toEqual(expected);
    });

    test("elif", () => {
      const expected = {
        "stmts": [
          {
            "exprs": [
              {
                "if": {
                  "cond": [
                    {
                      "exprs": [
                        {
                          "cmd": {
                            "assigns": [],
                            "name_and_args": [{ "simple": { "Text": "a" } }],
                            "redirect": {
                              "stdin": false,
                              "stdout": false,
                              "stderr": false,
                              "append": false,
                              "duplicate_out": false,
                              "__unused": 0,
                            },
                            "redirect_file": null,
                          },
                        },
                      ],
                    },
                  ],
                  "then": [
                    {
                      "exprs": [
                        {
                          "cmd": {
                            "assigns": [],
                            "name_and_args": [{ "simple": { "Text": "b" } }],
                            "redirect": {
                              "stdin": false,
                              "stdout": false,
                              "stderr": false,
                              "append": false,
                              "duplicate_out": false,
                              "__unused": 0,
                            },
                            "redirect_file": null,
                          },
                        },
                      ],
                    },
                  ],
                  "else_parts": [
                    [
                      {
                        "exprs": [
                          {
                            "cmd": {
                              "assigns": [],
                              "name_and_args": [{ "simple": { "Text": "c" } }],
                              "redirect": {
                                "stdin": false,
                                "stdout": false,
                                "stderr": false,
                                "append": false,
                                "duplicate_out": false,
                                "__unused": 0,
                              },
                              "redirect_file": null,
                            },
                          },
                        ],
                      },
                    ],
                    [
                      {
                        "exprs": [
                          {
                            "cmd": {
                              "assigns": [],
                              "name_and_args": [{ "simple": { "Text": "d" } }],
                              "redirect": {
                                "stdin": false,
                                "stdout": false,
                                "stderr": false,
                                "append": false,
                                "duplicate_out": false,
                                "__unused": 0,
                              },
                              "redirect_file": null,
                            },
                          },
                        ],
                      },
                    ],
                    [
                      {
                        "exprs": [
                          {
                            "cmd": {
                              "assigns": [],
                              "name_and_args": [{ "simple": { "Text": "e" } }],
                              "redirect": {
                                "stdin": false,
                                "stdout": false,
                                "stderr": false,
                                "append": false,
                                "duplicate_out": false,
                                "__unused": 0,
                              },
                              "redirect_file": null,
                            },
                          },
                        ],
                      },
                    ],
                  ],
                },
              },
            ],
          },
        ],
      };

      let result = JSON.parse(parse`if a; then b; elif c; then d; else e; fi`);
      expect(result).toEqual(expected);
    });

    describe("precedence", () => {
      test("in pipeline", () => {
        const expected = {
          "stmts": [
            {
              "exprs": [
                {
                  "pipeline": {
                    "items": [
                      {
                        "if": {
                          "cond": [
                            {
                              "exprs": [
                                {
                                  "cmd": {
                                    "assigns": [],
                                    "name_and_args": [{ "simple": { "Text": "echo" } }, { "simple": { "Text": "hi" } }],
                                    "redirect": {
                                      "stdin": false,
                                      "stdout": false,
                                      "stderr": false,
                                      "append": false,
                                      "duplicate_out": false,
                                      "__unused": 0,
                                    },
                                    "redirect_file": null,
                                  },
                                },
                              ],
                            },
                          ],
                          "then": [
                            {
                              "exprs": [
                                {
                                  "cmd": {
                                    "assigns": [],
                                    "name_and_args": [
                                      { "simple": { "Text": "echo" } },
                                      { "simple": { "Text": "lmao" } },
                                    ],
                                    "redirect": {
                                      "stdin": false,
                                      "stdout": false,
                                      "stderr": false,
                                      "append": false,
                                      "duplicate_out": false,
                                      "__unused": 0,
                                    },
                                    "redirect_file": null,
                                  },
                                },
                              ],
                            },
                          ],
                          "else_parts": [
                            [
                              {
                                "exprs": [
                                  {
                                    "cmd": {
                                      "assigns": [],
                                      "name_and_args": [
                                        { "simple": { "Text": "echo" } },
                                        { "simple": { "Text": "lol" } },
                                      ],
                                      "redirect": {
                                        "stdin": false,
                                        "stdout": false,
                                        "stderr": false,
                                        "append": false,
                                        "duplicate_out": false,
                                        "__unused": 0,
                                      },
                                      "redirect_file": null,
                                    },
                                  },
                                ],
                              },
                            ],
                          ],
                        },
                      },
                      {
                        "cmd": {
                          "assigns": [],
                          "name_and_args": [{ "simple": { "Text": "cat" } }],
                          "redirect": {
                            "stdin": false,
                            "stdout": false,
                            "stderr": false,
                            "append": false,
                            "duplicate_out": false,
                            "__unused": 0,
                          },
                          "redirect_file": null,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        };

        const result = JSON.parse(parse`if echo hi; then echo lmao; else echo lol; fi | cat`);
        expect(result).toEqual(expected);
      });
    });
  });

  describe.todo("async", () => {
    TestBuilder.command`echo foo & && echo hi`
      .error('"&" is not allowed on the left-hand side of "&&"')
      .runAsTest("left side of binary not allowed");

    TestBuilder.command`echo hi && echo foo & && echo hi`
      .error('"&" is not allowed on the left-hand side of "&&"')
      .runAsTest("left side of binary not allowed 2");

    test("right side of binary works", () => {
      const expected = {
        "stmts": [
          {
            "exprs": [
              {
                "binary": {
                  "op": "And",
                  "left": {
                    "cmd": {
                      "assigns": [],
                      "name_and_args": [{ "simple": { "Text": "echo" } }, { "simple": { "Text": "hi" } }],
                      "redirect": {
                        "stdin": false,
                        "stdout": false,
                        "stderr": false,
                        "append": false,
                        "duplicate_out": false,
                        "__unused": 0,
                      },
                      "redirect_file": null,
                    },
                  },
                  "right": {
                    "async": {
                      "cmd": {
                        "assigns": [],
                        "name_and_args": [{ "simple": { "Text": "echo" } }, { "simple": { "Text": "foo" } }],
                        "redirect": {
                          "stdin": false,
                          "stdout": false,
                          "stderr": false,
                          "append": false,
                          "duplicate_out": false,
                          "__unused": 0,
                        },
                        "redirect_file": null,
                      },
                    },
                  },
                },
              },
            ],
          },
        ],
      };

      const result = JSON.parse(parse`echo hi && echo foo &`);
      expect(result).toEqual(expected);
    });

    test("pipeline", () => {
      const expected = {
        "stmts": [
          {
            "exprs": [
              {
                "async": {
                  "pipeline": {
                    "items": [
                      {
                        "cmd": {
                          "assigns": [],
                          "name_and_args": [{ "simple": { "Text": "echo" } }, { "simple": { "Text": "hi" } }],
                          "redirect": {
                            "stdin": false,
                            "stdout": false,
                            "stderr": false,
                            "append": false,
                            "duplicate_out": false,
                            "__unused": 0,
                          },
                          "redirect_file": null,
                        },
                      },
                      {
                        "cmd": {
                          "assigns": [],
                          "name_and_args": [{ "simple": { "Text": "echo" } }, { "simple": { "Text": "foo" } }],
                          "redirect": {
                            "stdin": false,
                            "stdout": false,
                            "stderr": false,
                            "append": false,
                            "duplicate_out": false,
                            "__unused": 0,
                          },
                          "redirect_file": null,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        ],
      };

      const result = JSON.parse(parse`echo hi | echo foo &`);
      expect(result).toEqual(expected);
    });
  });

  describe("bad syntax", () => {
    test("cmd subst edgecase", () => {
      const expected = {
        stmts: [
          {
            exprs: [
              {
                cmd: {
                  assigns: [],
                  name_and_args: [
                    { simple: { Text: "echo" } },
                    {
                      simple: {
                        cmd_subst: {
                          script: {
                            stmts: [
                              {
                                exprs: [
                                  {
                                    cmd: {
                                      assigns: [
                                        {
                                          label: "FOO",
                                          value: { simple: { Text: "bar" } },
                                        },
                                      ],
                                      name_and_args: [{ simple: { Var: "FOO" } }],
                                      redirect: {
                                        stdin: false,
                                        stdout: false,
                                        stderr: false,
                                        append: false,
                                        duplicate_out: false,
                                        __unused: 0,
                                      },
                                      redirect_file: null,
                                    },
                                  },
                                ],
                              },
                            ],
                          },
                          quoted: false,
                        },
                      },
                    },
                  ],
                  redirect: {
                    stdin: false,
                    stdout: false,
                    stderr: false,
                    append: false,
                    duplicate_out: false,
                    __unused: 0,
                  },
                  redirect_file: null,
                },
              },
            ],
          },
        ],
      };
      const result = JSON.parse(parse`echo $(FOO=bar $FOO)`);
      expect(result).toEqual(expected);
    });

    test("cmd edgecase", () => {
      const expected = {
        "stmts": [
          {
            "exprs": [
              {
                "assign": [
                  { "label": "FOO", "value": { "simple": { "Text": "bar" } } },
                  { "label": "BAR", "value": { "simple": { "Text": "baz" } } },
                ],
              },
            ],
          },
          {
            "exprs": [
              {
                "cmd": {
                  "assigns": [{ "label": "BUN_DEBUG_QUIET_LOGS", "value": { "simple": { "Text": "1" } } }],
                  "name_and_args": [{ "simple": { "Text": "echo" } }],
                  "redirect": {
                    "stdin": false,
                    "stdout": false,
                    "stderr": false,
                    "append": false,
                    "duplicate_out": false,
                    "__unused": 0,
                  },
                  "redirect_file": null,
                },
              },
            ],
          },
        ],
      };
      const result = JSON.parse(parse`FOO=bar BAR=baz; BUN_DEBUG_QUIET_LOGS=1 echo`);
      expect(result).toEqual(expected);
    });
  });
});

describe("parse shell invalid input", () => {
  test("invalid js obj", async () => {
    const file = new Uint8Array(420);
    await TestBuilder.command`${file} | cat`.error(`expected a command or assignment but got: "JSObjRef"`).run();
  });

  test("subshell", async () => {
    await TestBuilder.command`echo (echo foo && echo hi)`.error("Unexpected token: `(`").run();

    await TestBuilder.command`echo foo >`.error("Redirection with no file").run();
  });
});
