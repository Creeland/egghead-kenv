/** @type typeof import("octokit") */
let { Octokit } = await npm("@octokit/rest");
let eggheadUserToken = await env("EGGHEAD_AUTH_TOKEN");
let { queryEggheadCourse, queryEggheadCourseUnauthed } = await lib("egghead");

let octokit = new Octokit();
export let getCourseNotesContentByPath = async (path) => {
  let { data } = await octokit.rest.repos.getContent({
    owner: "eggheadio",
    repo: "eggheadio-course-notes",
    path,
  });

  return data;
};

//! Loads course notes folders so you choose which notes to view
let rootContent = await getCourseNotesContentByPath("");
let { name: course } = await arg(
  "Select path",
  rootContent.filter((d) => d.type === "dir")
);

//! Loads individual course notes
//! expects notes to be in a `/notes` subfolder!
let notesContent = await getCourseNotesContentByPath(`${course}/notes`);

let getCourseNotesFolder = async () => {
  await run(kenvPath("kenvs", "egghead", "scripts", "egghead-course-notes.js"));
};

let getNote = async () => {
  let { name: fileName } = await arg(
    "Select a Note to view:",
    notesContent.filter((d) => d.type === "file" && d.name.endsWith(".md"))
  );

  let { content, encoding } = await getCourseNotesContentByPath(
    `${course}/notes/${fileName}`
  );

  return Buffer.from(content, encoding).toString();
};

let viewNote = async () => {
  await editor(await getNote());
};

let createCdnLink = (slug) =>
  `https://cdn.jsdelivr.net/gh/eggheadio/eggheadio-course-notes/${course}/notes/${slug}`;

let postNote = (url, noteCdn) => {
  put(
    url,
    {
      staff_notes_url: noteCdn,
    },
    {
      headers: {
        Authorization: `Bearer ${eggheadUserToken}`,
      },
    }
  )
    .then((response) => console.log(response.status))
    .catch((err) => console.log("POST ERROR ", err));
};

let publishNotes = async () => {
  let answer = await arg("Do you really want to publish these notes?", [
    { name: "Yes", value: true },
    { name: "No", value: false },
  ]);

  if (answer === true) {
    let courseSlug = await arg("Enter the course slug: ", [course]);
    console.log(courseSlug);
    let { items: lessons } = await queryEggheadCourseUnauthed(
      `https://app.egghead.io/api/v1/playlists/${courseSlug}`
    );
    let eggheadLessonSlugs = lessons.map((lesson) => lesson.slug);

    console.log(eggheadLessonSlugs);

    notesContent.map(async (note) => {
      let noteName = note.name
        .replace(/(^[0-9]+[-_])/g, "")
        .replace(/(\.md)/g, "");
      if (eggheadLessonSlugs.includes(noteName)) {
        let cdn = createCdnLink(note.name);
        let lessonUrl = `https://app.egghead.io/api/v1/lessons/${noteName}`;

        postNote(lessonUrl, cdn);
      }
    });
  } else {
    console.log("Maybe next time!");
  }
};

let publishSingleNote = async () => {
  let { name: fileName } = await arg(
    "Select a note to publish:",
    notesContent.filter((d) => d.type === "file" && d.name.endsWith(".md"))
  );

  let lessonSlug = fileName
    .replace(/(^[0-9]+[-_])/g, "")
    .replace(/(\.md)/g, "");

  let cdn = createCdnLink(fileName);
  let lessonUrl = `https://app.egghead.io/api/v1/lessons/${lessonSlug}`;
  postNote(lessonUrl, cdn);
};

onTab("View Note", viewNote);
onTab("Publish a Single Note", publishSingleNote);
onTab("Publish All Notes", publishNotes);
onTab("Select New Course", getCourseNotesFolder);