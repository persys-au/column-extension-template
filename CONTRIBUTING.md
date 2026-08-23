# Contributing

Thank you for helping improve the Column Extension Template. Keep contributions generic and
aligned with the package boundaries and engineering standards documented in [docs/script.md](docs/script.md).

## Developer Certificate of Origin

This project uses the [Developer Certificate of Origin 1.1](https://developercertificate.org/)
(DCO). By contributing, you certify that you have the right to submit your contribution under the
MIT license of this repository.

Every commit in a pull request must include a `Signed-off-by` trailer. Create commits with:

```bash
git commit -s -m "Describe the change"
```

This adds a trailer like:

```text
Signed-off-by: Your Name <your-email@example.com>
```

Use a name and email address that identify you and that you are comfortable publishing in the public
commit history. A GitHub-associated `noreply` address can avoid exposing a personal email address.

For a commit that has not been pushed, add the sign-off with:

```bash
git commit --amend --signoff --no-edit
```

The sign-off does not transfer copyright. It certifies that you have the right to submit the change
under this repository's MIT license.

## Checks

Before opening a pull request, run:

```bash
pnpm check
```

Do not commit `.env` files, credentials, or generated build output.
