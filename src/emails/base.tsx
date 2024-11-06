import { ReactNode } from "react";
import {
  Body,
  Column,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { columnStyle, sectionStyle, textStyle } from "./utils";

type Props = {
  previewText: string;
  children: ReactNode;
};

const ASSETS_BASE_URL = process.env.BASE_URL + "/api/assets";

export default function BaseTemplate({ previewText, children }: Props) {
  return (
    <Html>
      <Head>
        <Link
          href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Preview>{previewText}</Preview>
      <Body>
        <Section bgcolor="#f4f4f4">
          <Container
            bgcolor="#fff"
            style={{
              padding: "20px",
              fontFamily: '"Merriweather", serif',
            }}
          >
            <Section style={{ ...sectionStyle }} align="center">
              <Row>
                <Column
                  style={{
                    ...columnStyle,
                  }}
                >
                  <Img
                    alt="45Group Logo"
                    height={70}
                    width={70}
                    src={`${ASSETS_BASE_URL}/private/logo.png`}
                  />
                </Column>
              </Row>
            </Section>
            {children}
            <Section style={{ ...sectionStyle, marginTop: "28px" }}>
              <Row>
                <Column
                  style={{
                    ...columnStyle,
                  }}
                >
                  <Text style={{ ...textStyle }}>Best regards,</Text>
                  <Text style={{ ...textStyle }}>45Group</Text>
                </Column>
              </Row>
            </Section>
            <Section
              style={{ ...sectionStyle, textAlign: "center", marginTop: "32px" }}
              align="center"
            >
              <Row>
                <Column align="center" style={{ display: "inline-block", margin: "0 8px" }}>
                  <Link href="https://x.com/hotel45ng">
                    <Img
                      alt="X Logo"
                      height={20}
                      width={20}
                      src={`${ASSETS_BASE_URL}/private/twitter.png`}
                    />
                  </Link>
                </Column>
                <Column align="center" style={{ display: "inline-block", margin: "0 8px" }}>
                  <Link href="https://www.instagram.com/hotel45.ng">
                    <Img
                      alt="Instagram Logo"
                      height={20}
                      width={20}
                      src={`${ASSETS_BASE_URL}/private/instagram.png`}
                    />
                  </Link>
                </Column>
                <Column align="center" style={{ display: "inline-block", margin: "0 8px" }}>
                  <Link href="https://www.facebook.com/Hotel45.ng">
                    <Img
                      alt="Facebook Logo"
                      height={20}
                      width={20}
                      src={`${ASSETS_BASE_URL}/private/facebook.png`}
                    />
                  </Link>
                </Column>
              </Row>
            </Section>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}
